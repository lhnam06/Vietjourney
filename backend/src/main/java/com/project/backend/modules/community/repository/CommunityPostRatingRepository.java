package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityPostRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommunityPostRatingRepository extends JpaRepository<CommunityPostRating, String> {
    Optional<CommunityPostRating> findByPostIdAndUserId(String postId, String userId);

    long countByPostId(String postId);

    @Query("select coalesce(avg(r.rating), 0) from CommunityPostRating r where r.post.id = :postId")
    double averageRating(@Param("postId") String postId);
}
