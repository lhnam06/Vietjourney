package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityPostTag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommunityPostTagRepository extends JpaRepository<CommunityPostTag, String> {
    List<CommunityPostTag> findAllByPostId(String postId);
}
