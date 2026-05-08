package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.Timeline;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TimelineRepository extends JpaRepository<Timeline, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select t from Timeline t where t.id = :timelineId")
    Optional<Timeline> findByIdForUpdate(@Param("timelineId") String timelineId);

    boolean existsByIdAndOwnerUsername(String timelineId, String username);

    List<Timeline> findAllByOwnerUsernameOrderByCreatedAtDesc(String username);
}
