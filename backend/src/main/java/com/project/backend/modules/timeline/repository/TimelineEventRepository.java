package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TimelineEventRepository extends JpaRepository<TimelineEvent, String> {
    Optional<TimelineEvent> findByIdAndTimelineId(String eventId, String timelineId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select e from TimelineEvent e
            where e.timeline.id = :timelineId
              and e.startTime >= :dayStart
              and e.startTime < :dayEnd
              and e.status <> :cancelledStatus
            order by e.orderIndex asc, e.startTime asc, e.id asc
            """)
    List<TimelineEvent> findDayEventsForUpdate(
            @Param("timelineId") String timelineId,
            @Param("dayStart") LocalDateTime dayStart,
            @Param("dayEnd") LocalDateTime dayEnd,
            @Param("cancelledStatus") TimelineEventStatus cancelledStatus
    );

    @Query("""
            select case when count(e) > 0 then true else false end
            from TimelineEvent e
            where e.timeline.id = :timelineId
              and (:eventId is null or e.id <> :eventId)
              and e.status <> :cancelledStatus
              and e.startTime < :endTime
              and e.endTime > :startTime
            """)
    boolean existsOverlappingEvent(
            @Param("timelineId") String timelineId,
            @Param("eventId") String eventId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("cancelledStatus") TimelineEventStatus cancelledStatus
    );

    @Query("""
            select e from TimelineEvent e
            where e.timeline.id = :timelineId
              and (:eventId is null or e.id <> :eventId)
              and e.status <> :cancelledStatus
              and e.startTime < :endTime
              and e.endTime > :startTime
            """)
    List<TimelineEvent> findOverlappingEvents(
            @Param("timelineId") String timelineId,
            @Param("eventId") String eventId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("cancelledStatus") TimelineEventStatus cancelledStatus
    );

    @Query("""
            select e from TimelineEvent e
            where e.timeline.id = :timelineId
              and e.endTime > :rangeStart
              and e.startTime < :rangeEnd
            order by e.startTime asc, e.orderIndex asc, e.id asc
            """)
    List<TimelineEvent> findTimelineEventsInRange(
            @Param("timelineId") String timelineId,
            @Param("rangeStart") LocalDateTime rangeStart,
            @Param("rangeEnd") LocalDateTime rangeEnd
    );
}
