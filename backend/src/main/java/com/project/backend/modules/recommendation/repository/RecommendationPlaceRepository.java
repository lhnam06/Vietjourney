package com.project.backend.modules.recommendation.repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface RecommendationPlaceRepository {
    Optional<RecommendationPlaceCandidate> findByCategoryAndId(String category, String placeId);

    List<RecommendationPlaceCandidate> findCandidates(int limit);

    List<RecommendationPlaceCandidate> findCandidates(int limit, Set<String> categories, Set<String> districts);

    List<RecommendationPlaceCandidate> findRandom(int limit);
}
