package com.project.backend.modules.timeline.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.repository.TimelineProposalRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
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
    ObjectMapper objectMapper;

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineProposal submitProposal(String timelineId, String changeType, Map<String, Object> payload, Integer baseVersion) {
        timelineSecurityService.requireEditAccess(timelineId);
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));

        TimelineProposal proposal = TimelineProposal.builder()
                .timeline(timeline)
                .author(userRepository.findByUsername(timelineSecurityService.getCurrentUsername())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST)))
                .baseVersion(baseVersion)
                .changeType(changeType)
                .payload(payload)
                .status(TimelineProposalStatus.PENDING)
                .build();

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
        timelineSecurityService.requireOwnerAccess(timelineId);
        TimelineProposal proposal = timelineProposalRepository.findById(proposalId)
                .filter(p -> p.getTimeline().getId().equals(timelineId))
                .orElseThrow(() -> new AppException(ErrorCode.PROPOSAL_NOT_FOUND));

        if (proposal.getStatus() != TimelineProposalStatus.PENDING) {
            throw new AppException(ErrorCode.PROPOSAL_ALREADY_PROCESSED);
        }

        if (status == TimelineProposalStatus.ACCEPTED) {
            applyProposal(proposal);
        }
        
        proposal.setStatus(status);
        timelineProposalRepository.save(proposal);
    }

    private void applyProposal(TimelineProposal proposal) {
        try {
            Map<String, Object> payload = proposal.getPayload();
            String timelineId = proposal.getTimeline().getId();

            switch (proposal.getChangeType()) {
                case "ADD":
                    CreateTimelineEventRequest createRequest = objectMapper.convertValue(payload, CreateTimelineEventRequest.class);
                    timelineEventService.addEvent(timelineId, createRequest);
                    break;
                case "MOVE":
                    String eventId = (String) payload.get("eventId");
                    MoveTimelineEventRequest moveRequest = objectMapper.convertValue(payload, MoveTimelineEventRequest.class);
                    timelineEventService.moveEvent(timelineId, eventId, moveRequest);
                    break;
                case "DELETE":
                    String delId = (String) payload.get("eventId");
                    timelineEventService.deleteEvent(timelineId, delId);
                    break;
            }
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            throw new AppException(ErrorCode.UNCATEGORIZED_EXCEPTION, "Lỗi khi áp dụng thay đổi: " + e.getMessage());
        }
    }
}
