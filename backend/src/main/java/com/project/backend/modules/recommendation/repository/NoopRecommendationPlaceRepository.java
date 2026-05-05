package com.project.backend.modules.recommendation.repository;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
@ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoopRecommendationPlaceRepository implements RecommendationPlaceRepository {
    @Override
    public Optional<RecommendationPlaceCandidate> findByCategoryAndId(String category, String placeId) {
        return Optional.empty();
    }

    @Override
    public List<RecommendationPlaceCandidate> findCandidates(int limit) {
        return List.of();
    }

    @Override
    public List<RecommendationPlaceCandidate> findCandidates(int limit, Set<String> categories, Set<String> districts) {
        return List.of();
    }

    @Override
    public List<RecommendationPlaceCandidate> findRandom(int limit) {
        return List.of();
    }
}
