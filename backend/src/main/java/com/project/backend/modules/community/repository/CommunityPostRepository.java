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
              and (:query is null
                   or lower(p.caption) like lower(concat('%', :query, '%'))
                   or lower(p.timeline.title) like lower(concat('%', :query, '%'))
                   or exists (
                       select tag from CommunityPostTag tag
                       where tag.post = p
                         and lower(tag.tag) like lower(concat('%', :query, '%'))
                   ))
              and (:tag is null or exists (
                   select tagFilter from CommunityPostTag tagFilter
                   where tagFilter.post = p
                     and lower(tagFilter.tag) = lower(:tag)
              ))
            """)
    Page<CommunityPost> searchPublished(
            @Param("status") CommunityPostStatus status,
            @Param("query") String query,
            @Param("tag") String tag,
            Pageable pageable
    );

    @Query("""
            select distinct p from CommunityPost p
            where p.status = :status
              and p.author.id in :authorIds
              and (:query is null
                   or lower(p.caption) like lower(concat('%', :query, '%'))
                   or lower(p.timeline.title) like lower(concat('%', :query, '%'))
                   or exists (
                       select tag from CommunityPostTag tag
                       where tag.post = p
                         and lower(tag.tag) like lower(concat('%', :query, '%'))
                   ))
              and (:tag is null or exists (
                   select tagFilter from CommunityPostTag tagFilter
                   where tagFilter.post = p
                     and lower(tagFilter.tag) = lower(:tag)
              ))
            """)
    Page<CommunityPost> searchPublishedByAuthors(
            @Param("status") CommunityPostStatus status,
            @Param("authorIds") Collection<String> authorIds,
            @Param("query") String query,
            @Param("tag") String tag,
            Pageable pageable
    );

    List<CommunityPost> findTop10ByStatusOrderByCopyCountDescCreatedAtDesc(CommunityPostStatus status);

    long countByAuthorIdAndStatus(String authorId, CommunityPostStatus status);
}
