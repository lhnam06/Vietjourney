package com.project.backend.modules.recommendation.repository;

import com.project.backend.modules.recommendation.entity.UserCategoryPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserCategoryPreferenceRepository extends JpaRepository<UserCategoryPreference, String> {
    Optional<UserCategoryPreference> findByUser_IdAndCategory(String userId, String category);

    List<UserCategoryPreference> findTop10ByUser_IdOrderByScoreDescUpdatedAtDesc(String userId);
}
