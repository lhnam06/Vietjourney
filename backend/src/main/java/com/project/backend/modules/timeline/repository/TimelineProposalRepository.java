package com.project.backend.modules.timeline.repository;

import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TimelineProposalRepository extends JpaRepository<TimelineProposal, String> {
    List<TimelineProposal> findAllByTimelineId(String timelineId);
    List<TimelineProposal> findAllByTimelineIdAndStatus(String timelineId, TimelineProposalStatus status);
}
