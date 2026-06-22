package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimelineProposalRepository extends JpaRepository<TimelineProposal, String> {
    List<TimelineProposal> findAllByTimelineId(String timelineId);
    List<TimelineProposal> findAllByTimelineIdOrderByCreatedAtDesc(String timelineId);
    List<TimelineProposal> findAllByTimelineIdAndAuthorUsernameOrderByCreatedAtDesc(String timelineId, String username);
    List<TimelineProposal> findAllByTimelineIdAndStatus(String timelineId, TimelineProposalStatus status);
    List<TimelineProposal> findAllByTimelineIdAndStatusAndAuthorUsername(
            String timelineId,
            TimelineProposalStatus status,
            String username
    );
}
