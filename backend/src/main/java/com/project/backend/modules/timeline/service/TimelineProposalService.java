package com.project.backend.modules.timeline.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.repository.TimelineProposalRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineProposalService {
    TimelineProposalRepository timelineProposalRepository;
    TimelineRepository timelineRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    TimelineEventService timelineEventService;

    @Transactional
    public TimelineProposal submitProposal(String timelineId, String changeType, Map<String, Object> payload, Integer baseVersion) {
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));

        User author = userRepository.findByUsername(getCurrentUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));

        TimelineProposal proposal = TimelineProposal.builder()
                .timeline(timeline)
                .author(author)
                .baseVersion(baseVersion)
                .changeType(changeType)
                .payload(payload)
                .status(TimelineProposalStatus.PENDING)
                .build();

        // Automatic stale check
        if (baseVersion < timeline.getVersion()) {
            proposal.setStatus(TimelineProposalStatus.OUTDATED);
        }

        return timelineProposalRepository.save(proposal);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public List<TimelineProposal> getPendingProposals(String timelineId) {
        return timelineProposalRepository.findAllByTimelineIdAndStatus(timelineId, TimelineProposalStatus.PENDING);
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public void decideProposal(String timelineId, String proposalId, TimelineProposalStatus status) {
        TimelineProposal proposal = timelineProposalRepository.findById(proposalId)
                .orElseThrow(() -> new AppException(ErrorCode.PROPOSAL_NOT_FOUND));

        if (!proposal.getTimeline().getId().equals(timelineId)) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }

        if (status == TimelineProposalStatus.ACCEPTED) {
            applyProposal(proposal);
            // Increment version after successful apply
            Timeline timeline = proposal.getTimeline();
            timeline.setVersion(timeline.getVersion() + 1);
            timelineRepository.save(timeline);
        }

        proposal.setStatus(status);
        timelineProposalRepository.save(proposal);
    }

    private void applyProposal(TimelineProposal proposal) {
        String timelineId = proposal.getTimeline().getId();
        Map<String, Object> payload = proposal.getPayload();

        try {
            switch (proposal.getChangeType()) {
                case "ADD":
                    com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest addReq = 
                        new com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest();
                    addReq.setExternalPlaceId((String) payload.get("externalPlaceId"));
                    addReq.setCategory(com.project.backend.modules.timeline.enums.TimelineEventCategory.valueOf((String) payload.get("category")));
                    addReq.setStartTime(java.time.LocalDateTime.parse((String) payload.get("startTime")));
                    addReq.setEndTime(java.time.LocalDateTime.parse((String) payload.get("endTime")));
                    addReq.setNotes((String) payload.get("notes"));
                    addReq.setOrderIndex((Integer) payload.get("orderIndex"));
                    timelineEventService.addEvent(timelineId, addReq);
                    break;

                case "MOVE":
                    String moveEventId = (String) payload.get("eventId");
                    com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest moveReq = 
                        new com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest();
                    moveReq.setStartTime(java.time.LocalDateTime.parse((String) payload.get("startTime")));
                    moveReq.setEndTime(java.time.LocalDateTime.parse((String) payload.get("endTime")));
                    moveReq.setOrderIndex((Integer) payload.get("orderIndex"));
                    timelineEventService.moveEvent(timelineId, moveEventId, moveReq);
                    break;

                case "DELETE":
                    String deleteEventId = (String) payload.get("eventId");
                    timelineEventService.deleteEvent(timelineId, deleteEventId);
                    break;

                default:
                    throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
            }
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION);
        }
    }

    private String getCurrentUsername() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }
}
