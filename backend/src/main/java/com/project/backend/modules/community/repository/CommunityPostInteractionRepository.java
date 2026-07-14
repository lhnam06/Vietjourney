package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityPostInteraction;
import com.project.backend.modules.community.enums.CommunityInteractionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommunityPostInteractionRepository extends JpaRepository<CommunityPostInteraction, String> {
    long countByPostIdAndType(String postId, CommunityInteractionType type);

    boolean existsByPostIdAndUserIdAndType(String postId, String userId, CommunityInteractionType type);

    Optional<CommunityPostInteraction> findByPostIdAndUserIdAndType(String postId, String userId, CommunityInteractionType type);

    void deleteByPostId(String postId);
}
