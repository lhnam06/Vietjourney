package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.TimelineInviteCode;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TimelineInviteCodeRepository extends JpaRepository<TimelineInviteCode, String> {
    @Modifying
    @Query("update TimelineInviteCode code set code.active = false where code.timeline.id = :timelineId and code.active = true")
    int deactivateActiveByTimelineId(@Param("timelineId") String timelineId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select code from TimelineInviteCode code where code.codeHash = :codeHash and code.active = true")
    Optional<TimelineInviteCode> findActiveByCodeHashForUpdate(@Param("codeHash") String codeHash);

    boolean existsByCodeHashAndActiveTrue(String codeHash);
}
