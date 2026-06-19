package com.project.backend.modules.community.repository;

import com.project.backend.modules.community.entity.CommunityPost;
import com.project.backend.modules.community.enums.CommunityPostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CommunityPostRepository extends JpaRepository<CommunityPost, String> {
    @Query("""
            select distinct p from CommunityPost p
            where p.status = :status
              and (:queryBlank = true
                   or lower(p.caption) like :queryPattern
                   or lower(p.timeline.title) like :queryPattern
                   or exists (
                       select tag from CommunityPostTag tag
                       where tag.post = p
                         and lower(tag.tag) like :queryPattern
                   ))
              and (:tagCount = 0 or (
                   select count(distinct tagFilter.tag) from CommunityPostTag tagFilter
                   where tagFilter.post = p
                     and lower(tagFilter.tag) in :tags
              ) = :tagCount)
            """)
    Page<CommunityPost> searchPublished(
            @Param("status") CommunityPostStatus status,
            @Param("queryBlank") boolean queryBlank,
            @Param("queryPattern") String queryPattern,
            @Param("tagCount") long tagCount,
            @Param("tags") Collection<String> tags,
            Pageable pageable
    );

    @Query("""
            select distinct p from CommunityPost p
            where p.status = :status
              and p.author.id in :authorIds
              and (:queryBlank = true
                   or lower(p.caption) like :queryPattern
                   or lower(p.timeline.title) like :queryPattern
                   or exists (
                       select tag from CommunityPostTag tag
                       where tag.post = p
                         and lower(tag.tag) like :queryPattern
                   ))
              and (:tagCount = 0 or (
                   select count(distinct tagFilter.tag) from CommunityPostTag tagFilter
                   where tagFilter.post = p
                     and lower(tagFilter.tag) in :tags
              ) = :tagCount)
            """)
    Page<CommunityPost> searchPublishedByAuthors(
            @Param("status") CommunityPostStatus status,
            @Param("authorIds") Collection<String> authorIds,
            @Param("queryBlank") boolean queryBlank,
            @Param("queryPattern") String queryPattern,
            @Param("tagCount") long tagCount,
            @Param("tags") Collection<String> tags,
            Pageable pageable
    );

    List<CommunityPost> findTop10ByStatusOrderByCopyCountDescCreatedAtDesc(CommunityPostStatus status);

    long countByAuthorIdAndStatus(String authorId, CommunityPostStatus status);
}
