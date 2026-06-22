package com.project.backend.modules.timeline.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.UpdateTimelineProposalScheduleRequest;
import com.project.backend.modules.timeline.dto.response.TimelineProposalDateCountResponse;
import com.project.backend.modules.timeline.dto.response.TimelineProposalResponse;
import com.project.backend.modules.timeline.dto.response.TimelineProposalReviewPageResponse;
import com.project.backend.modules.timeline.dto.response.TimelineProposalReviewSummaryResponse;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineProposalReviewState;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineProposalRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.TreeMap;

import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineProposalService {
    TimelineProposalRepository timelineProposalRepository;
    TimelineRepository timelineRepository;
    TimelineEventRepository timelineEventRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    TimelineEventService timelineEventService;
    TimelineEventPublisher timelineEventPublisher;
    PlaceLookupService placeLookupService;
    ObjectMapper objectMapper;

    @Transactional
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public TimelineProposal submitProposal(String timelineId, String changeType, Map<String, Object> payload, Integer baseVersion) {
        timelineSecurityService.requireViewAccess(timelineId);
        String normalizedChangeType = changeType == null ? "" : changeType.trim().toUpperCase(java.util.Locale.ROOT);
        if (!List.of("ADD", "MOVE", "DELETE").contains(normalizedChangeType)) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
        if (!timelineSecurityService.canEditTimeline(timelineId) && !"ADD".equals(normalizedChangeType)) {
            throw new AppException(ErrorCode.TIMELINE_ACCESS_DENIED);
        }
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        validateProposalPayload(timeline, normalizedChangeType, payload);

        TimelineProposal proposal = TimelineProposal.builder()
                .timeline(timeline)
                .author(userRepository.findByUsername(timelineSecurityService.getCurrentUsername())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST)))
                .baseVersion(baseVersion)
                .changeType(normalizedChangeType)
                .payload(new LinkedHashMap<>(payload))
                .status(TimelineProposalStatus.PENDING)
                .build();

        TimelineProposal savedProposal = timelineProposalRepository.save(proposal);
        publishProposalEventAfterCommit(timelineId, "PROPOSAL_CREATED", proposalPayload(
                timelineId,
                savedProposal.getId(),
                savedProposal.getStatus().name()
        ));
        return savedProposal;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public List<TimelineProposalResponse> getPendingProposals(String timelineId) {
        timelineSecurityService.requireViewAccess(timelineId);
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        List<TimelineProposal> proposals;
        if (!timelineSecurityService.canEditTimeline(timelineId)) {
            proposals = timelineProposalRepository.findAllByTimelineIdAndStatusAndAuthorUsername(
                    timelineId,
                    TimelineProposalStatus.PENDING,
                    timelineSecurityService.getCurrentUsername()
            );
        } else {
            proposals = timelineProposalRepository.findAllByTimelineIdAndStatus(timelineId, TimelineProposalStatus.PENDING);
        }

        proposals.sort(Comparator.comparing(TimelineProposal::getCreatedAt).reversed());
        List<TimelineEvent> events = getTimelineEvents(timeline);
        return proposals.stream().map(proposal -> toResponse(proposal, events)).toList();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public TimelineProposalReviewPageResponse getReviewPage(
            String timelineId,
            TimelineProposalReviewState state,
            LocalDate date,
            int page,
            int size
    ) {
        timelineSecurityService.requireViewAccess(timelineId);
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        List<TimelineProposal> proposals = timelineSecurityService.canEditTimeline(timelineId)
                ? timelineProposalRepository.findAllByTimelineIdOrderByCreatedAtDesc(timelineId)
                : timelineProposalRepository.findAllByTimelineIdAndAuthorUsernameOrderByCreatedAtDesc(
                        timelineId,
                        timelineSecurityService.getCurrentUsername()
                );
        List<TimelineEvent> events = getTimelineEvents(timeline);
        List<TimelineProposalResponse> responses = proposals.stream()
                .map(proposal -> toResponse(proposal, events))
                .toList();

        TimelineProposalReviewSummaryResponse summary = buildSummary(responses);
        List<TimelineProposalResponse> filtered = responses.stream()
                .filter(response -> state == null || response.getReviewState() == state)
                .filter(response -> date == null || Objects.equals(scheduleDate(response.getPayload()), date))
                .toList();

        int safeSize = Math.max(1, Math.min(size, 50));
        int totalPages = filtered.isEmpty() ? 0 : (int) Math.ceil((double) filtered.size() / safeSize);
        int safePage = totalPages == 0 ? 0 : Math.min(Math.max(0, page), totalPages - 1);
        int fromIndex = Math.min(safePage * safeSize, filtered.size());
        int toIndex = Math.min(fromIndex + safeSize, filtered.size());

        return TimelineProposalReviewPageResponse.builder()
                .content(new ArrayList<>(filtered.subList(fromIndex, toIndex)))
                .totalElements(filtered.size())
                .totalPages(totalPages)
                .number(safePage)
                .size(safeSize)
                .summary(summary)
                .build();
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineProposalResponse updateSchedule(
            String timelineId,
            String proposalId,
            UpdateTimelineProposalScheduleRequest request
    ) {
        timelineSecurityService.requireEditAccess(timelineId);
        TimelineProposal proposal = getProposal(timelineId, proposalId);
        if (proposal.getStatus() != TimelineProposalStatus.PENDING) {
            throw new AppException(ErrorCode.PROPOSAL_ALREADY_PROCESSED);
        }

        validateScheduleRange(proposal.getTimeline(), request.getStartTime(), request.getEndTime());
        Map<String, Object> payload = new LinkedHashMap<>(proposal.getPayload());
        payload.put("startTime", request.getStartTime().toString());
        payload.put("endTime", request.getEndTime().toString());
        proposal.setPayload(payload);
        TimelineProposal saved = timelineProposalRepository.saveAndFlush(proposal);

        publishProposalEventAfterCommit(timelineId, "PROPOSAL_UPDATED", proposalPayload(
                timelineId,
                saved.getId(),
                saved.getStatus().name()
        ));
        return toResponse(saved, getTimelineEvents(saved.getTimeline()));
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public void decideProposal(String timelineId, String proposalId, TimelineProposalStatus status) {
        timelineSecurityService.requireEditAccess(timelineId);
        if (status == TimelineProposalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
        TimelineProposal proposal = getProposal(timelineId, proposalId);

        if (proposal.getStatus() != TimelineProposalStatus.PENDING) {
            throw new AppException(ErrorCode.PROPOSAL_ALREADY_PROCESSED);
        }

        if (status == TimelineProposalStatus.ACCEPTED) {
            TimelineProposalResponse review = toResponse(proposal, getTimelineEvents(proposal.getTimeline()));
            if (review.getReviewState() == TimelineProposalReviewState.UNSCHEDULED) {
                throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA, "Đề xuất chưa có ngày giờ hợp lệ");
            }
            if (review.getReviewState() == TimelineProposalReviewState.CONFLICT) {
                throw new AppException(ErrorCode.TIMELINE_EVENT_OVERLAP, review.getConflictReason());
            }
            applyProposal(proposal);
        }
        
        proposal.setStatus(status);
        timelineProposalRepository.save(proposal);

        // Broadcast decision to clear shadow object on all clients
        publishProposalEventAfterCommit(timelineId, "PROPOSAL_DECIDED", proposalPayload(
                timelineId,
                proposalId,
                status.name()
        ));
    }

    private Map<String, Object> proposalPayload(String timelineId, String proposalId, String status) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("timelineId", timelineId);
        payload.put("id", proposalId);
        payload.put("status", status);
        payload.put("refetch", true);
        String actorUsername = timelineSecurityService.getCurrentUsername();
        if (actorUsername != null) {
            payload.put("actor", actorUsername);
        }
        return payload;
    }

    private void publishProposalEventAfterCommit(String timelineId, String type, Object data) {
        Runnable publishTask = () -> timelineEventPublisher.publishEvent(timelineId, type, data);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishTask.run();
                }
            });
            return;
        }

        publishTask.run();
    }

    private void applyProposal(TimelineProposal proposal) {
        try {
            Map<String, Object> payload = proposal.getPayload();
            String timelineId = proposal.getTimeline().getId();

            switch (proposal.getChangeType()) {
                case "ADD":
                    CreateTimelineEventRequest createRequest = objectMapper.convertValue(payload, CreateTimelineEventRequest.class);
                    timelineEventService.addEvent(timelineId, createRequest);
                    break;
                case "MOVE":
                    String eventId = (String) payload.get("eventId");
                    MoveTimelineEventRequest moveRequest = objectMapper.convertValue(payload, MoveTimelineEventRequest.class);
                    timelineEventService.moveEvent(timelineId, eventId, moveRequest);
                    break;
                case "DELETE":
                    String delId = (String) payload.get("eventId");
                    timelineEventService.deleteEvent(timelineId, delId);
                    break;
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi áp dụng thay đổi: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public TimelineProposalResponse toResponse(TimelineProposal proposal) {
        return toResponse(proposal, getTimelineEvents(proposal.getTimeline()));
    }

    private TimelineProposal getProposal(String timelineId, String proposalId) {
        return timelineProposalRepository.findById(proposalId)
                .filter(proposal -> proposal.getTimeline().getId().equals(timelineId))
                .orElseThrow(() -> new AppException(ErrorCode.PROPOSAL_NOT_FOUND));
    }

    private void validateProposalPayload(Timeline timeline, String changeType, Map<String, Object> payload) {
        if (!"ADD".equals(changeType)) {
            return;
        }

        String externalPlaceId = stringValue(payload.get("externalPlaceId"));
        if (externalPlaceId == null || externalPlaceId.isBlank()) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
        TimelineEventCategory category = proposalCategory(payload);
        placeLookupService.assertPlaceExists(category, externalPlaceId);

        LocalDateTime startTime = payloadDateTime(payload, "startTime");
        LocalDateTime endTime = payloadDateTime(payload, "endTime");
        boolean hasStart = payload.containsKey("startTime") && payload.get("startTime") != null;
        boolean hasEnd = payload.containsKey("endTime") && payload.get("endTime") != null;
        if (hasStart != hasEnd) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
        if (hasStart) {
            validateScheduleRange(timeline, startTime, endTime);
        }
    }

    private void validateScheduleRange(Timeline timeline, LocalDateTime startTime, LocalDateTime endTime) {
        if (startTime == null || endTime == null || !startTime.isBefore(endTime)) {
            throw new AppException(ErrorCode.INVALID_TIMELINE_EVENT_RANGE);
        }
        LocalDateTime allowedStart = timeline.getStartDate().atStartOfDay();
        LocalDateTime allowedEnd = timeline.getEndDate().plusDays(1).atStartOfDay();
        if (startTime.isBefore(allowedStart) || endTime.isAfter(allowedEnd)) {
            throw new AppException(ErrorCode.TIMELINE_EVENT_OUTSIDE_TIMELINE_RANGE);
        }
    }

    private List<TimelineEvent> getTimelineEvents(Timeline timeline) {
        return timelineEventRepository.findTimelineEventsInRange(
                timeline.getId(),
                timeline.getStartDate().atStartOfDay(),
                timeline.getEndDate().plusDays(1).atStartOfDay()
        );
    }

    private TimelineProposalResponse toResponse(TimelineProposal proposal, List<TimelineEvent> events) {
        Map<String, Object> payload = proposal.getPayload();
        LocalDateTime startTime = payloadDateTime(payload, "startTime");
        LocalDateTime endTime = payloadDateTime(payload, "endTime");
        TimelineProposalReviewState reviewState = TimelineProposalReviewState.READY;
        String conflictEventId = null;
        String conflictReason = null;

        if (proposal.getStatus() != TimelineProposalStatus.PENDING) {
            reviewState = TimelineProposalReviewState.PROCESSED;
        } else if (startTime == null || endTime == null || !startTime.isBefore(endTime)) {
            reviewState = TimelineProposalReviewState.UNSCHEDULED;
        } else {
            Timeline timeline = proposal.getTimeline();
            LocalDateTime allowedStart = timeline.getStartDate().atStartOfDay();
            LocalDateTime allowedEnd = timeline.getEndDate().plusDays(1).atStartOfDay();
            if (startTime.isBefore(allowedStart) || endTime.isAfter(allowedEnd)) {
                reviewState = TimelineProposalReviewState.CONFLICT;
                conflictReason = "Thời gian đề xuất nằm ngoài phạm vi chuyến đi";
            } else {
                String movedEventId = "MOVE".equals(proposal.getChangeType())
                        ? stringValue(payload.get("eventId"))
                        : null;
                TimelineEvent overlap = events.stream()
                        .filter(event -> event.getStatus() != TimelineEventStatus.CANCELLED)
                        .filter(event -> movedEventId == null || !movedEventId.equals(event.getId()))
                        .filter(event -> event.getStartTime().isBefore(endTime) && event.getEndTime().isAfter(startTime))
                        .findFirst()
                        .orElse(null);
                if (overlap != null) {
                    reviewState = TimelineProposalReviewState.CONFLICT;
                    conflictEventId = overlap.getId();
                    String overlapName = placeLookupService.findPlace(overlap.getCategory(), overlap.getExternalPlaceId())
                            .map(PlaceSummary::getName)
                            .orElse("hoạt động hiện tại");
                    conflictReason = String.format(
                            "Trùng với %s lúc %s",
                            overlapName,
                            overlap.getStartTime().toLocalTime().toString().substring(0, 5)
                    );
                }
            }
        }

        TimelineEventCategory category = proposalCategory(payload);
        String externalPlaceId = stringValue(payload.get("externalPlaceId"));
        PlaceSummary place = externalPlaceId == null
                ? null
                : placeLookupService.findPlace(category, externalPlaceId).orElse(null);

        return TimelineProposalResponse.builder()
                .id(proposal.getId())
                .timelineId(proposal.getTimeline().getId())
                .authorId(proposal.getAuthor().getId())
                .authorUsername(proposal.getAuthor().getUsername())
                .baseVersion(proposal.getBaseVersion())
                .changeType(proposal.getChangeType())
                .payload(payload)
                .status(proposal.getStatus())
                .reviewState(reviewState)
                .placeName(place == null ? null : place.getName())
                .placeAddress(place == null ? null : place.getAddress())
                .conflictEventId(conflictEventId)
                .conflictReason(conflictReason)
                .createdAt(proposal.getCreatedAt())
                .updatedAt(proposal.getUpdatedAt())
                .build();
    }

    private TimelineProposalReviewSummaryResponse buildSummary(List<TimelineProposalResponse> proposals) {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        Map<LocalDate, Long> dateCounts = new TreeMap<>();
        long newToday = 0;
        long ready = 0;
        long conflict = 0;
        long unscheduled = 0;
        long processed = 0;

        for (TimelineProposalResponse proposal : proposals) {
            if (proposal.getCreatedAt() != null && proposal.getCreatedAt().toLocalDate().equals(today)) {
                newToday++;
            }
            switch (proposal.getReviewState()) {
                case READY -> ready++;
                case CONFLICT -> conflict++;
                case UNSCHEDULED -> unscheduled++;
                case PROCESSED -> processed++;
            }
            if (proposal.getStatus() == TimelineProposalStatus.PENDING) {
                LocalDate scheduledDate = scheduleDate(proposal.getPayload());
                if (scheduledDate != null) {
                    dateCounts.merge(scheduledDate, 1L, Long::sum);
                }
            }
        }

        List<TimelineProposalDateCountResponse> byDate = dateCounts.entrySet().stream()
                .map(entry -> TimelineProposalDateCountResponse.builder()
                        .date(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();
        return TimelineProposalReviewSummaryResponse.builder()
                .newToday(newToday)
                .ready(ready)
                .conflict(conflict)
                .unscheduled(unscheduled)
                .processed(processed)
                .byDate(byDate)
                .build();
    }

    private LocalDate scheduleDate(Map<String, Object> payload) {
        LocalDateTime startTime = payloadDateTime(payload, "startTime");
        return startTime == null ? null : startTime.toLocalDate();
    }

    private LocalDateTime payloadDateTime(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        if (value instanceof LocalDateTime dateTime) {
            return dateTime;
        }
        if (value == null || value.toString().isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(value.toString());
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private TimelineEventCategory proposalCategory(Map<String, Object> payload) {
        String rawCategory = stringValue(payload.get("category"));
        if (rawCategory == null) {
            return TimelineEventCategory.ACTIVITY;
        }
        try {
            return TimelineEventCategory.valueOf(rawCategory.toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
    }

    private String stringValue(Object value) {
        return value == null ? null : value.toString();
    }
}
