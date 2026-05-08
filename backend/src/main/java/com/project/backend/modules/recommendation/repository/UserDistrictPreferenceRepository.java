package com.project.backend.modules.recommendation.repository;

import com.project.backend.modules.recommendation.entity.UserDistrictPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserDistrictPreferenceRepository extends JpaRepository<UserDistrictPreference, String> {
    Optional<UserDistrictPreference> findByUser_IdAndDistrict(String userId, String district);

    List<UserDistrictPreference> findTop15ByUser_IdOrderByScoreDescUpdatedAtDesc(String userId);
}
