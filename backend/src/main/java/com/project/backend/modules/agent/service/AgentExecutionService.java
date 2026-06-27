package com.project.backend.modules.agent.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.modules.agent.dto.request.ExecutionMode;
import com.project.backend.modules.agent.dto.request.ExecutePlanRequest;
import com.project.backend.modules.agent.dto.request.ProposedEvent;
import com.project.backend.modules.agent.dto.response.EventExecutionResult;
import com.project.backend.modules.agent.dto.response.EventStatus;
import com.project.backend.modules.agent.dto.response.ExecutePlanResponse;
import com.project.backend.modules.place.config.PlaceLookupProperties;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.timeline.dto.response.TimelineResponse;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.service.TimelineEventService;
import com.project.backend.modules.timeline.service.TimelineProposalService;
import com.project.backend.modules.timeline.service.TimelineService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Core service for the Vietjourney Agent Feature.
 *
 * Consumes a JSON plan (timeline array) produced by the Hugging Face planning
 * agent and executes it against the existing Vietjourney backend services.
 *
 * <h3>Workflow</h3>
 * <ol>
 *   <li>Resolve place details ({@code location → externalPlaceId})</li>
 *   <li>Infer {@code category} from {@code activity} text</li>
 *   <li>Parse {@code time} range into {@code startTime / endTime}</li>
 *   <li>For DIRECT_ADD: call {@link TimelineEventService#addEvent}</li>
 *   <li>For PROPOSAL: call {@link TimelineProposalService#submitProposal}</li>
 *   <li>Collect per-event results into a summary</li>
 * </ol>
 *
 * Cross-reference: {@code docs/Agent_Feature_Implementation_Plan.md §6}
 * Cross-reference: {@code d:\Study\HuggingFace\planning-agent\API_DOCS.md}
 */
@Slf4j
@Service
public class AgentExecutionService {

    private static final Pattern TIME_RANGE_PATTERN =
            Pattern.compile("(\\d{1,2}):(\\d{2})\\s*-\\s*(\\d{1,2}):(\\d{2})");

    /** Activity → category inference rules. Ordered by priority. */
    private static final List<CategoryRule> CATEGORY_RULES = List.of(
            new CategoryRule(Set.of("cafe", "coffee", "trà", "tea", "uống", "drink", "nước"),
                    TimelineEventCategory.DRINK),
            new CategoryRule(Set.of("ăn", "eat", "food", "nhà hàng", "restaurant", "quán ăn",
                    "đồ nướng", "bbq", "lẩu", "hotpot", "phở", "bún", "cơm", "bánh",
                    "bữa sáng", "bữa trưa", "bữa tối", "breakfast", "lunch", "dinner"),
                    TimelineEventCategory.FOOD),
            new CategoryRule(Set.of("ăn", "eat", "food", "nhà hàng", "restaurant", "quán ăn",
                    "đồ nướng", "đồ ăn", "bữa", "bistro"),
                    TimelineEventCategory.FOOD)
    );

    private final TimelineEventService timelineEventService;
    private final TimelineProposalService timelineProposalService;
    private final TimelineService timelineService;
    private final JdbcTemplate placeJdbcTemplate;
    private final PlaceLookupProperties placeLookupProperties;

    @Autowired
    public AgentExecutionService(
            TimelineEventService timelineEventService,
            TimelineProposalService timelineProposalService,
            TimelineService timelineService,
            @Qualifier("placeJdbcTemplate") JdbcTemplate placeJdbcTemplate,
            PlaceLookupProperties placeLookupProperties) {
        this.timelineEventService = timelineEventService;
        this.timelineProposalService = timelineProposalService;
        this.timelineService = timelineService;
        this.placeJdbcTemplate = placeJdbcTemplate;
        this.placeLookupProperties = placeLookupProperties;
    }

    /* ----------------------------------------------------------------- */
    /*  Public entry point                                                */
    /* ----------------------------------------------------------------- */

    /**
     * Execute a plan produced by the Hugging Face agent against the
     * authenticated user's timeline.
     *
     * Each event is processed in its own transaction (handled by the downstream
     * services' @Transactional annotations), so a failure in one event does
     * not roll back successfully completed events.
     *
     * @param request the execution plan from the frontend
     * @return a summary of per-event results
     */
    public ExecutePlanResponse executePlan(ExecutePlanRequest request) {
        List<ProposedEvent> events = request.getTimeline();
        LocalDate startDate;
        try {
            startDate = LocalDate.parse(request.getStartDate());
        } catch (DateTimeParseException e) {
            throw new AppException(com.project.backend.common.exception.ErrorCode.INVALID_REQUEST_BODY,
                    "Invalid startDate format. Expected yyyy-MM-dd.");
        }

        // Pre-fetch timeline context for proposals
        TimelineResponse timeline = null;
        if (request.getMode() == ExecutionMode.PROPOSAL) {
            try {
                timeline = timelineService.getTimeline(request.getTimelineId());
            } catch (Exception e) {
                log.warn("[Agent] Could not fetch timeline context for proposals: {}", e.getMessage());
            }
        }

        List<EventExecutionResult> results = new ArrayList<>(events.size());
        int orderIndexCounter = 0;

        for (int i = 0; i < events.size(); i++) {
            ProposedEvent event = events.get(i);
            var resultBuilder = EventExecutionResult.builder()
                    .index(i)
                    .label(buildLabel(event));

            try {
                // Step 1: Resolve place ID
                String externalPlaceId = resolveExternalPlaceId(event);
                if (externalPlaceId == null) {
                    log.warn("[Agent] Could not resolve place for event {}: {}", i, event.getLocation());
                    results.add(resultBuilder
                            .status(EventStatus.ERROR)
                            .errorMessage("Không tìm thấy địa điểm: " + event.getLocation())
                            .build());
                    continue;
                }

                // Step 2: Infer category
                TimelineEventCategory category = inferCategory(event.getActivity());

                // Step 3: Parse time
                TimeRange timeRange = parseTimeRange(event.getTime(), startDate, i);
                if (timeRange == null) {
                    results.add(resultBuilder
                            .status(EventStatus.SKIPPED)
                            .errorMessage("Không thể phân tích khung giờ: " + event.getTime())
                            .build());
                    continue;
                }

                // Step 4: Build CreateTimelineEventRequest
                CreateTimelineEventRequest createRequest = CreateTimelineEventRequest.builder()
                        .externalPlaceId(externalPlaceId)
                        .category(category)
                        .startTime(timeRange.startTime)
                        .endTime(timeRange.endTime)
                        .orderIndex(orderIndexCounter++)
                        .notes(buildNotes(event))
                        .build();

                // Step 5: Execute
                if (request.getMode() == ExecutionMode.PROPOSAL) {
                    executeAsProposal(request.getTimelineId(), createRequest, timeline, resultBuilder);
                } else {
                    executeAsDirectAdd(request.getTimelineId(), createRequest, resultBuilder);
                }

                results.add(resultBuilder.build());

            } catch (AppException e) {
                log.warn("[Agent] AppException for event {} ({}): code={} msg={}",
                        i, event.getLocation(), e.getErrorCode(), e.getMessage());
                results.add(resultBuilder
                        .status(EventStatus.ERROR)
                        .errorMessage(e.getMessage())
                        .build());
            } catch (Exception e) {
                log.error("[Agent] Unexpected error for event {} ({}): {}", i, event.getLocation(), e.getMessage(), e);
                results.add(resultBuilder
                        .status(EventStatus.ERROR)
                        .errorMessage("Lỗi hệ thống: " + e.getMessage())
                        .build());
            }
        }

        // Build summary
        long successCount = results.stream().filter(r -> r.getStatus() == EventStatus.SUCCESS).count();
        long skippedCount = results.stream().filter(r -> r.getStatus() == EventStatus.SKIPPED).count();
        long errorCount = results.stream().filter(r -> r.getStatus() == EventStatus.ERROR).count();

        return ExecutePlanResponse.builder()
                .totalEvents(events.size())
                .successCount((int) successCount)
                .skippedCount((int) skippedCount)
                .errorCount((int) errorCount)
                .results(results)
                .build();
    }

    /* ----------------------------------------------------------------- */
    /*  Place resolution                                                  */
    /* ----------------------------------------------------------------- */

    /**
     * Resolve a proposed event's location into an {@code externalPlaceId}.
     *
     * Priority:
     * <ol>
     *   <li>If {@code location_id} is a UUID, use it directly.</li>
     *   <li>Otherwise search the place database by name using SQL ILIKE.</li>
     * </ol>
     */
    String resolveExternalPlaceId(ProposedEvent event) {
        // 1. Try location_id directly (must be a UUID that actually exists in the DB)
        String locId = event.getLocationId();
        if (locId != null && !locId.isBlank() && isValidUuid(locId)) {
            if (placeExistsInAnyTable(locId)) {
                return locId;
            }
            log.warn("[Agent] location_id '{}' is a UUID but not found in any place table, falling back to name search", locId);
        }

        String locationName = event.getLocation();
        if (locationName == null || locationName.isBlank()) {
            return null;
        }

        // 2. Search by name using direct SQL ILIKE across all 3 place tables
        TimelineEventCategory category = inferCategory(event.getActivity());
        try {
            String matchedId = searchByName(locationName, category);
            if (matchedId != null) return matchedId;

            // Category fallback: try the other two tables
            for (TimelineEventCategory fallback : TimelineEventCategory.values()) {
                if (fallback == category) continue;
                matchedId = searchByName(locationName, fallback);
                if (matchedId != null) {
                    log.info("[Agent] Category-fallback resolved '{}' in {} instead of {}",
                            locationName, fallback, category);
                    return matchedId;
                }
            }

            log.warn("[Agent] No place match found for '{}' in any category", locationName);
        } catch (Exception e) {
            log.warn("[Agent] Place lookup failed for '{}': {}", locationName, e.getMessage());
        }

        return null;
    }

    /**
     * Check if a place ID exists in ANY of the three place tables.
     */
    private boolean placeExistsInAnyTable(String placeId) {
        String[] tables = {
                placeLookupProperties.getFoodTable(),
                placeLookupProperties.getDrinkTable(),
                placeLookupProperties.getActivityTable()
        };
        String idColumn = placeLookupProperties.getIdColumn();
        for (String table : tables) {
            try {
                String sql = "SELECT COUNT(*) FROM " + table + " WHERE " + idColumn + "::text = ?";
                Integer count = placeJdbcTemplate.queryForObject(sql, Integer.class, placeId);
                if (count != null && count > 0) {
                    return true;
                }
            } catch (Exception e) {
                log.warn("[Agent] Existence check failed for table {}: {}", table, e.getMessage());
            }
        }
        return false;
    }

    /**
     * Search for a place by name in the given category's table using ILIKE.
     * Returns the place ID if found, null otherwise.
     */
    private String searchByName(String locationName, TimelineEventCategory category) {
        String tableName = switch (category) {
            case FOOD -> placeLookupProperties.getFoodTable();
            case DRINK -> placeLookupProperties.getDrinkTable();
            case ACTIVITY -> placeLookupProperties.getActivityTable();
        };
        String idColumn = placeLookupProperties.getIdColumn();

        // Use ILIKE for case-insensitive matching, wrap in %% for partial match
        // Also strip diacritics using unaccent() if available, otherwise just do ILIKE
        String sql = "SELECT " + idColumn + "::text AS id, name FROM " + tableName
                + " WHERE LOWER(name) LIKE LOWER(?)"
                + " LIMIT 1";

        String likePattern = "%" + locationName.trim() + "%";

        try {
            List<Map<String, Object>> rows = placeJdbcTemplate.queryForList(sql, likePattern);
            if (!rows.isEmpty()) {
                String matchedId = (String) rows.get(0).get("id");
                String matchedName = (String) rows.get(0).get("name");
                log.info("[Agent] Resolved '{}' → place ID {} (matched name: '{}' in table {})",
                        locationName, matchedId, matchedName, tableName);
                return matchedId;
            }
        } catch (Exception e) {
            log.warn("[Agent] SQL search failed for '{}' in table {}: {}", locationName, tableName, e.getMessage());
        }

        // Fallback: try removing diacritics on both sides via Java REPLACE
        String normQuery = removeDiacritics(locationName.toLowerCase().trim());
        try {
            String sqlNorm = "SELECT " + idColumn + "::text AS id, name FROM " + tableName;
            List<Map<String, Object>> allRows = placeJdbcTemplate.queryForList(sqlNorm);
            for (Map<String, Object> row : allRows) {
                String dbId = (String) row.get("id");
                String dbName = (String) row.get("name");
                if (dbName != null && removeDiacritics(dbName.toLowerCase()).contains(normQuery)) {
                    log.info("[Agent] Diacritics-fallback resolved '{}' → place ID {} (name: '{}' in table {})",
                            locationName, dbId, dbName, tableName);
                    return dbId;
                }
            }
        } catch (Exception e) {
            log.warn("[Agent] Diacritics fallback failed for '{}' in table {}: {}", locationName, tableName, e.getMessage());
        }

        return null;
    }

    /* ----------------------------------------------------------------- */
    /*  Category inference                                                */
    /* ----------------------------------------------------------------- */

    /**
     * Infer a {@link TimelineEventCategory} from the activity description.
     *
     * Uses keyword matching. Falls back to ACTIVITY when nothing matches.
     */
    TimelineEventCategory inferCategory(String activity) {
        if (activity == null || activity.isBlank()) {
            return TimelineEventCategory.ACTIVITY;
        }

        String lower = activity.toLowerCase().trim();

        // DRINK keywords
        if (containsAnyKeyword(lower, CATEGORY_RULES.get(0).keywords())) {
            return TimelineEventCategory.DRINK;
        }
        // Check for food keywords (if "drink" didn't match)
        if (containsAnyKeyword(lower, CATEGORY_RULES.get(1).keywords())) {
            return TimelineEventCategory.FOOD;
        }

        return TimelineEventCategory.ACTIVITY;
    }

    /* ----------------------------------------------------------------- */
    /*  Time parsing                                                      */
    /* ----------------------------------------------------------------- */

    record TimeRange(LocalDateTime startTime, LocalDateTime endTime) {}

    /**
     * Parse "HH:mm - HH:mm" into start/end LocalDateTime values on the given date.
     */
    TimeRange parseTimeRange(String timeStr, LocalDate startDate, int orderHint) {
        if (timeStr == null || timeStr.isBlank()) {
            // Default: start at 9 AM, 2-hour block, offset by order
            LocalTime start = LocalTime.of(9 + orderHint * 2, 0);
            if (start.getHour() > 21) start = LocalTime.of(9, 0);
            return new TimeRange(
                    LocalDateTime.of(startDate, start),
                    LocalDateTime.of(startDate, start.plusHours(2))
            );
        }

        Matcher m = TIME_RANGE_PATTERN.matcher(timeStr.trim());
        if (m.matches()) {
            try {
                int startHour = Integer.parseInt(m.group(1));
                int startMin = Integer.parseInt(m.group(2));
                int endHour = Integer.parseInt(m.group(3));
                int endMin = Integer.parseInt(m.group(4));

                return new TimeRange(
                        LocalDateTime.of(startDate, LocalTime.of(startHour, startMin)),
                        LocalDateTime.of(startDate, LocalTime.of(endHour, endMin))
                );
            } catch (DateTimeParseException e) {
                log.warn("[Agent] Invalid time segment in '{}'", timeStr);
            }
        }

        // Fallback: try "HH:mm - HH:mm" without leading zeros etc.
        // Already handled by the pattern. If we get here, parsing failed.
        return null;
    }

    /* ----------------------------------------------------------------- */
    /*  Execution helpers                                                 */
    /* ----------------------------------------------------------------- */

    private void executeAsDirectAdd(
            String timelineId,
            CreateTimelineEventRequest request,
            EventExecutionResult.EventExecutionResultBuilder resultBuilder
    ) {
        try {
            TimelineEventResponse response = timelineEventService.addEvent(timelineId, request);
            resultBuilder.status(EventStatus.SUCCESS)
                    .entityId(response.getId())
                    .errorMessage(null);
            log.info("[Agent] Direct-add success: eventId={} place={}", response.getId(), request.getExternalPlaceId());
        } catch (AppException e) {
            resultBuilder.status(EventStatus.ERROR).errorMessage(e.getMessage());
            log.warn("[Agent] Direct-add failed: {}", e.getMessage());
        }
    }

    private void executeAsProposal(
            String timelineId,
            CreateTimelineEventRequest createRequest,
            TimelineResponse timeline,
            EventExecutionResult.EventExecutionResultBuilder resultBuilder
    ) {
        try {
            // Build payload map matching the backend's expected structure
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("externalPlaceId", createRequest.getExternalPlaceId());
            payload.put("category", createRequest.getCategory().name());
            payload.put("startTime", createRequest.getStartTime().toString());
            payload.put("endTime", createRequest.getEndTime().toString());
            payload.put("orderIndex", createRequest.getOrderIndex());
            payload.put("notes", createRequest.getNotes());

            int baseVersion = (timeline != null && timeline.getEvents() != null)
                    ? (int) timeline.getEvents().stream()
                    .mapToLong(e -> e.getVersion() != null ? e.getVersion() : 0L)
                    .max().orElse(0)
                    : 0;

            var proposal = timelineProposalService.submitProposal(
                    timelineId,
                    "ADD",
                    payload,
                    baseVersion
            );

            resultBuilder.status(EventStatus.SUCCESS)
                    .entityId(proposal.getId())
                    .errorMessage(null);
            log.info("[Agent] Proposal success: proposalId={} place={}", proposal.getId(), createRequest.getExternalPlaceId());
        } catch (AppException e) {
            resultBuilder.status(EventStatus.ERROR).errorMessage(e.getMessage());
            log.warn("[Agent] Proposal failed: {}", e.getMessage());
        }
    }

    /* ----------------------------------------------------------------- */
    /*  Utility methods                                                   */
    /* ----------------------------------------------------------------- */

    private String buildLabel(ProposedEvent event) {
        StringBuilder sb = new StringBuilder();
        if (event.getActivity() != null) sb.append(event.getActivity());
        if (event.getLocation() != null) {
            if (!sb.isEmpty()) sb.append(" tại ");
            sb.append(event.getLocation());
        }
        return sb.isEmpty() ? "Sự kiện" : sb.toString();
    }

    private String buildNotes(ProposedEvent event) {
        StringBuilder sb = new StringBuilder();
        sb.append(event.getLocation() != null ? event.getLocation() : "");
        if (event.getActivity() != null) {
            sb.append(" — ").append(event.getActivity());
        }
        if (event.getCostEstimate() != null && !event.getCostEstimate().isBlank()) {
            sb.append(" | Chi phí: ").append(event.getCostEstimate()).append(" VNĐ");
        }
        return sb.toString();
    }

    private boolean isValidUuid(String s) {
        if (s == null || s.isBlank()) return false;
        // Standard UUID pattern: 8-4-4-4-12 hex digits
        return s.matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}");
    }

    private boolean containsAnyKeyword(String text, Set<String> keywords) {
        return keywords.stream().anyMatch(text::contains);
    }

    /**
     * Strip Vietnamese diacritics so that "Bánh đa cua" matches "banh da cua".
     * Uses NFD decomposition to split base chars from combining marks, then removes the marks.
     * Also handles đ/Đ → d/D.
     */
    private String removeDiacritics(String input) {
        if (input == null || input.isBlank()) return input;
        String decomposed = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        decomposed = decomposed.replace('đ', 'd').replace('Đ', 'D');
        return decomposed;
    }

    private record CategoryRule(Set<String> keywords, TimelineEventCategory category) {}
}
