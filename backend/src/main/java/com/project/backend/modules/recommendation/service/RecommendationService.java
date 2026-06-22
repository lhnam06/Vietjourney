package com.project.backend.modules.recommendation.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.recommendation.dto.request.PlaceInteractionBatchRequest;
import com.project.backend.modules.recommendation.dto.request.PlaceInteractionRequest;
import com.project.backend.modules.recommendation.dto.response.InteractionRecordedResponse;
import com.project.backend.modules.recommendation.dto.response.RecommendationDebugResponse;
import com.project.backend.modules.recommendation.dto.response.RecommendedPlaceResponse;
import com.project.backend.modules.recommendation.dto.response.UserProfileResponse;
import com.project.backend.modules.recommendation.entity.UserCategoryPreference;
import com.project.backend.modules.recommendation.entity.UserDistrictPreference;
import com.project.backend.modules.recommendation.entity.UserPlaceInteraction;
import com.project.backend.modules.recommendation.entity.UserTagPreference;
import com.project.backend.modules.recommendation.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
@RequiredArgsConstructor
public class RecommendationService {
    private static final Set<String> VALID_CATEGORIES = Set.of("food", "drink", "activity");
    private static final Set<String> ALLOWED_TAG_GROUPS = Set.of(
            "sub_category", "purpose", "service_style", "vibe", "amenity"
    );
    private static final double DECAY_PER_DAY = 0.98;
    private static final int MAX_CANDIDATE_POOL = 120;

    private final UserRepository userRepository;
    private final UserPlaceInteractionRepository interactionRepository;
    private final UserTagPreferenceRepository tagPreferenceRepository;
    private final UserDistrictPreferenceRepository districtPreferenceRepository;
    private final UserCategoryPreferenceRepository categoryPreferenceRepository;
    private final RecommendationPlaceRepository placeRepository;

    @Transactional
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public InteractionRecordedResponse recordInteraction(PlaceInteractionRequest request) {
        return recordInteractions(PlaceInteractionBatchRequest.builder()
                .interactions(List.of(request))
                .build());
    }

    @Transactional
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public InteractionRecordedResponse recordInteractions(PlaceInteractionBatchRequest request) {
        User user = currentUser();
        int recorded = 0;
        for (PlaceInteractionRequest interaction : request.getInteractions()) {
            recordOne(user, interaction);
            recorded++;
        }
        return InteractionRecordedResponse.builder()
                .recorded(recorded)
                .build();
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public List<RecommendedPlaceResponse> recommendPlaces(int size) {
        long startNanos = System.nanoTime();
        User user = currentUser();
        int limit = normalizeSize(size);

        List<UserTagPreference> tagPreferences = tagPreferenceRepository.findTop30ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId());
        List<UserDistrictPreference> districtPreferences = districtPreferenceRepository.findTop15ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId());
        List<UserCategoryPreference> categoryPreferences = categoryPreferenceRepository.findTop10ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId());
        long afterProfileNanos = System.nanoTime();

        if (tagPreferences.isEmpty() && districtPreferences.isEmpty() && categoryPreferences.isEmpty()) {
            List<RecommendedPlaceResponse> random = placeRepository.findRandom(limit).stream()
                    .map(candidate -> toResponse(candidate, null))
                    .toList();
            long endNanos = System.nanoTime();
            log.debug("recommendPlaces(user={}, size={}): profile={}ms random={}ms total={}ms",
                    user.getId(),
                    limit,
                    ms(startNanos, afterProfileNanos),
                    ms(afterProfileNanos, endNanos),
                    ms(startNanos, endNanos));
            return random;
        }

        int candidatePool = Math.min(MAX_CANDIDATE_POOL, Math.max(60, limit * 6));
        Set<String> preferredCategories = categoryPreferences.stream()
                .sorted(Comparator.comparing(this::decayedCategoryScore).reversed())
                .limit(2)
                .map(UserCategoryPreference::getCategory)
                .collect(Collectors.toSet());
        Set<String> preferredDistricts = districtPreferences.stream()
                .sorted(Comparator.comparing(this::decayedDistrictScore).reversed())
                .limit(3)
                .map(UserDistrictPreference::getDistrict)
                .collect(Collectors.toSet());

        List<RecommendationPlaceCandidate> candidates = placeRepository.findCandidates(candidatePool, preferredCategories, preferredDistricts);
        long afterCandidateNanos = System.nanoTime();
        if (candidates.isEmpty()) {
            return List.of();
        }

        PreferenceModel model = PreferenceModel.from(tagPreferences, districtPreferences, categoryPreferences);
        List<RecommendedPlaceResponse> result = candidates.stream()
                .map(candidate -> new ScoredCandidate(candidate, score(candidate, model)))
                .sorted(Comparator.comparing((ScoredCandidate item) -> item.debug().getTotalScore()).reversed()
                        .thenComparing(item -> Optional.ofNullable(item.candidate().getRating()).orElse(0.0), Comparator.reverseOrder())
                        .thenComparing(item -> item.candidate().getName(), Comparator.nullsLast(String::compareToIgnoreCase)))
                .limit(limit)
                .map(item -> toResponse(item.candidate(), item.debug()))
                .toList();
        long endNanos = System.nanoTime();
        log.debug("recommendPlaces(user={}, size={}): profile={}ms candidates={}ms scoring={}ms total={}ms pool={} categories={} districts={}",
                user.getId(),
                limit,
                ms(startNanos, afterProfileNanos),
                ms(afterProfileNanos, afterCandidateNanos),
                ms(afterCandidateNanos, endNanos),
                ms(startNanos, endNanos),
                candidatePool,
                preferredCategories.size(),
                preferredDistricts.size());
        return result;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public UserProfileResponse getMyProfile() {
        User user = currentUser();
        return UserProfileResponse.builder()
                .tags(tagPreferenceRepository.findTop30ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId()).stream()
                        .map(pref -> UserProfileResponse.TagPreferenceResponse.builder()
                                .tagGroup(pref.getTagGroup())
                                .tagValue(pref.getTagValue())
                                .score(decayedTagScore(pref))
                                .build())
                        .filter(pref -> pref.getScore() > 0.05)
                        .toList())
                .districts(districtPreferenceRepository.findTop15ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId()).stream()
                        .map(pref -> UserProfileResponse.PreferenceResponse.builder()
                                .value(pref.getDistrict())
                                .score(decayedDistrictScore(pref))
                                .build())
                        .filter(pref -> pref.getScore() > 0.05)
                        .toList())
                .categories(categoryPreferenceRepository.findTop10ByUser_IdOrderByScoreDescUpdatedAtDesc(user.getId()).stream()
                        .map(pref -> UserProfileResponse.PreferenceResponse.builder()
                                .value(pref.getCategory())
                                .score(decayedCategoryScore(pref))
                                .build())
                        .filter(pref -> pref.getScore() > 0.05)
                        .toList())
                .build();
    }

    private void recordOne(User user, PlaceInteractionRequest request) {
        String category = normalizeCategory(request.getCategory());
        int score = resolveScore(request);

        RecommendationPlaceCandidate place = placeRepository.findByCategoryAndId(category, request.getPlaceId())
                .orElseGet(() -> fallbackPlace(request, category));

        interactionRepository.save(UserPlaceInteraction.builder()
                .user(user)
                .placeId(request.getPlaceId())
                .category(category)
                .eventType(request.getEventType())
                .score(score)
                .build());

        incrementCategory(user, category, score);
        if (hasValue(place.getDistrict())) {
            incrementDistrict(user, place.getDistrict().trim(), score);
        }
        incrementTags(user, place.getTags(), score);
    }

    private RecommendationPlaceCandidate fallbackPlace(PlaceInteractionRequest request, String category) {
        if (!hasValue(request.getDistrict()) && (request.getTags() == null || request.getTags().isEmpty())) {
            throw new AppException(ErrorCode.PLACE_NOT_EXIST);
        }
        return RecommendationPlaceCandidate.builder()
                .id(request.getPlaceId())
                .category(category)
                .district(request.getDistrict())
                .tags(request.getTags())
                .build();
    }

    private RecommendationDebugResponse score(RecommendationPlaceCandidate candidate, PreferenceModel model) {
        Map<String, Double> matchedTags = new LinkedHashMap<>();
        double matchedTagScore = 0.0;
        if (candidate.getTags() != null) {
            for (Map.Entry<String, List<String>> groupEntry : candidate.getTags().entrySet()) {
                if (!ALLOWED_TAG_GROUPS.contains(groupEntry.getKey()) || groupEntry.getValue() == null) {
                    continue;
                }
                for (String tagValue : groupEntry.getValue()) {
                    Double preferenceScore = model.tagScores().get(tagKey(groupEntry.getKey(), tagValue));
                    if (preferenceScore != null) {
                        matchedTagScore += preferenceScore;
                        matchedTags.put(tagKey(groupEntry.getKey(), tagValue), preferenceScore);
                    }
                }
            }
        }

        double tagScore = normalize(matchedTagScore, model.totalTopTagScore());
        double districtScore = normalize(model.districtScores().get(normalizeText(candidate.getDistrict())), model.maxDistrictScore());
        double categoryScore = normalize(model.categoryScores().get(normalizeCategory(candidate.getCategory())), model.maxCategoryScore());
        double ratingScore = candidate.getRating() == null ? 0.0 : Math.min(100.0, Math.max(0.0, candidate.getRating() / 5.0 * 100.0));
        double totalScore = tagScore * 0.55 + districtScore * 0.25 + categoryScore * 0.10 + ratingScore * 0.10;

        return RecommendationDebugResponse.builder()
                .totalScore(totalScore)
                .tagScore(tagScore)
                .districtScore(districtScore)
                .categoryScore(categoryScore)
                .ratingScore(ratingScore)
                .matchedTags(matchedTags)
                .build();
    }

    private void incrementTags(User user, Map<String, List<String>> tags, int score) {
        if (tags == null) {
            return;
        }
        for (Map.Entry<String, List<String>> entry : tags.entrySet()) {
            String group = normalizeText(entry.getKey());
            if (!ALLOWED_TAG_GROUPS.contains(group) || entry.getValue() == null) {
                continue;
            }
            entry.getValue().stream()
                    .filter(this::hasValue)
                    .map(this::normalizeText)
                    .distinct()
                    .forEach(value -> incrementTag(user, group, value, score));
        }
    }

    private void incrementTag(User user, String group, String value, int score) {
        UserTagPreference preference = tagPreferenceRepository
                .findByUser_IdAndTagGroupAndTagValue(user.getId(), group, value)
                .orElseGet(() -> UserTagPreference.builder()
                        .user(user)
                        .tagGroup(group)
                        .tagValue(value)
                        .score(0.0)
                        .build());
        preference.setScore(decayedTagScore(preference) + score);
        tagPreferenceRepository.save(preference);
    }

    private void incrementDistrict(User user, String district, int score) {
        String normalizedDistrict = normalizeText(district);
        UserDistrictPreference preference = districtPreferenceRepository
                .findByUser_IdAndDistrict(user.getId(), normalizedDistrict)
                .orElseGet(() -> UserDistrictPreference.builder()
                        .user(user)
                        .district(normalizedDistrict)
                        .score(0.0)
                        .build());
        preference.setScore(decayedDistrictScore(preference) + score);
        districtPreferenceRepository.save(preference);
    }

    private void incrementCategory(User user, String category, int score) {
        UserCategoryPreference preference = categoryPreferenceRepository
                .findByUser_IdAndCategory(user.getId(), category)
                .orElseGet(() -> UserCategoryPreference.builder()
                        .user(user)
                        .category(category)
                        .score(0.0)
                        .build());
        preference.setScore(decayedCategoryScore(preference) + score);
        categoryPreferenceRepository.save(preference);
    }

    private RecommendedPlaceResponse toResponse(RecommendationPlaceCandidate candidate, RecommendationDebugResponse debug) {
        return RecommendedPlaceResponse.builder()
                .id(candidate.getId())
                .name(candidate.getName())
                .address(candidate.getAddress())
                .category(candidate.getCategory())
                .district(candidate.getDistrict())
                .images(candidate.getImages())
                .tags(candidate.getTags())
                .rating(candidate.getRating())
                .minPrice(candidate.getMinPrice())
                .maxPrice(candidate.getMaxPrice())
                .latitude(candidate.getLatitude())
                .longitude(candidate.getLongitude())
                .debug(debug)
                .build();
    }

    private User currentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
    }

    private int resolveScore(PlaceInteractionRequest request) {
        if (request.getScore() != null && request.getScore() > 0) {
            return Math.min(request.getScore(), 50);
        }
        return request.getEventType().getDefaultScore();
    }

    private int normalizeSize(int size) {
        if (size <= 0) return 20;
        return Math.min(size, 50);
    }

    private String normalizeCategory(String category) {
        String normalized = normalizeText(category);
        if (!VALID_CATEGORIES.contains(normalized)) {
            throw new AppException(ErrorCode.INVALID_CATEGORY);
        }
        return normalized;
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private boolean hasValue(String value) {
        return value != null && !value.isBlank();
    }

    private String tagKey(String group, String value) {
        return normalizeText(group) + ":" + normalizeText(value);
    }

    private double normalize(Double value, double max) {
        if (value == null || max <= 0) {
            return 0.0;
        }
        return Math.min(100.0, Math.max(0.0, value / max * 100.0));
    }

    private double decayedTagScore(UserTagPreference preference) {
        return applyDecay(preference.getScore(), preference.getUpdatedAt());
    }

    private double decayedDistrictScore(UserDistrictPreference preference) {
        return applyDecay(preference.getScore(), preference.getUpdatedAt());
    }

    private double decayedCategoryScore(UserCategoryPreference preference) {
        return applyDecay(preference.getScore(), preference.getUpdatedAt());
    }

    private static double applyDecay(Double score, LocalDateTime updatedAt) {
        if (score == null || score <= 0) {
            return 0.0;
        }
        if (updatedAt == null) {
            return score;
        }
        long days = Math.max(0, ChronoUnit.DAYS.between(updatedAt, LocalDateTime.now()));
        return score * Math.pow(DECAY_PER_DAY, days);
    }

    private long ms(long start, long end) {
        return (end - start) / 1_000_000;
    }

    private record ScoredCandidate(RecommendationPlaceCandidate candidate, RecommendationDebugResponse debug) {
    }

    private record PreferenceModel(
            Map<String, Double> tagScores,
            Map<String, Double> districtScores,
            Map<String, Double> categoryScores,
            double totalTopTagScore,
            double maxDistrictScore,
            double maxCategoryScore
    ) {
        static PreferenceModel from(
                List<UserTagPreference> tags,
                List<UserDistrictPreference> districts,
                List<UserCategoryPreference> categories
        ) {
            Map<String, Double> tagScores = tags.stream()
                    .collect(Collectors.toMap(
                            pref -> pref.getTagGroup() + ":" + pref.getTagValue(),
                            pref -> applyDecay(pref.getScore(), pref.getUpdatedAt()),
                            Double::sum,
                            LinkedHashMap::new
                    ));
            Map<String, Double> districtScores = districts.stream()
                    .collect(Collectors.toMap(
                            UserDistrictPreference::getDistrict,
                            pref -> applyDecay(pref.getScore(), pref.getUpdatedAt()),
                            Double::sum,
                            LinkedHashMap::new
                    ));
            Map<String, Double> categoryScores = categories.stream()
                    .collect(Collectors.toMap(
                            UserCategoryPreference::getCategory,
                            pref -> applyDecay(pref.getScore(), pref.getUpdatedAt()),
                            Double::sum,
                            LinkedHashMap::new
                    ));

            return new PreferenceModel(
                    tagScores,
                    districtScores,
                    categoryScores,
                    tagScores.values().stream().mapToDouble(Double::doubleValue).sum(),
                    districtScores.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0),
                    categoryScores.values().stream().mapToDouble(Double::doubleValue).max().orElse(0.0)
            );
        }
    }
}
