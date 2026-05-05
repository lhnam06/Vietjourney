package com.project.backend.modules.recommendation.repository;

import com.project.backend.modules.recommendation.entity.UserTagPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserTagPreferenceRepository extends JpaRepository<UserTagPreference, String> {
    Optional<UserTagPreference> findByUser_IdAndTagGroupAndTagValue(String userId, String tagGroup, String tagValue);

    List<UserTagPreference> findTop30ByUser_IdOrderByScoreDescUpdatedAtDesc(String userId);
}
