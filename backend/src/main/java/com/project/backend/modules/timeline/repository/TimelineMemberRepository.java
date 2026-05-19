package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.TimelineMember;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TimelineMemberRepository extends JpaRepository<TimelineMember, String> {
    Optional<TimelineMember> findByTimelineIdAndUserUsername(String timelineId, String username);

    boolean existsByTimelineIdAndUserUsernameAndRoleIn(String timelineId, String username, Collection<TimelineMemberRole> roles);

    List<TimelineMember> findAllByTimelineIdOrderByCreatedAtAsc(String timelineId);

    List<TimelineMember> findAllByUserUsername(String username);
}
