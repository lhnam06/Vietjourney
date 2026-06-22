package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunityCommentRepository extends JpaRepository<CommunityComment, String> {
    long countByPostId(String postId);

    List<CommunityComment> findAllByPostIdOrderByCreatedAtDesc(String postId);

    void deleteByPostId(String postId);
}
