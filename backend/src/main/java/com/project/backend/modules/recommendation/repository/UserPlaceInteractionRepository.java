package com.project.backend.modules.recommendation.repository;

import com.project.backend.modules.recommendation.entity.UserPlaceInteraction;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserPlaceInteractionRepository extends JpaRepository<UserPlaceInteraction, String> {
}
