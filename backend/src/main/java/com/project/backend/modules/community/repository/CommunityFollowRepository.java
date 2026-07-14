package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityFollow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CommunityFollowRepository extends JpaRepository<CommunityFollow, String> {
    Optional<CommunityFollow> findByFollowerIdAndFollowingId(String followerId, String followingId);

    boolean existsByFollowerIdAndFollowingId(String followerId, String followingId);

    List<CommunityFollow> findAllByFollowerId(String followerId);

    long countByFollowingId(String followingId);
}
