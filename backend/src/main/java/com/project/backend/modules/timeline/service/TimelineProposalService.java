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
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;
import java.util.HashMap;
import java.util.Map;

import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineProposalService {
    TimelineProposalRepository timelineProposalRepository;
    TimelineRepository timelineRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    TimelineEventService timelineEventService;
    TimelineEventPublisher timelineEventPublisher;
    ObjectMapper objectMapper;

    @Transactional
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public TimelineProposal submitProposal(String timelineId, String changeType, Map<String, Object> payload, Integer baseVersion) {
        timelineSecurityService.requireViewAccess(timelineId);
        String normalizedChangeType = changeType == null ? "" : changeType.trim().toUpperCase(java.util.Locale.ROOT);
        if (!List.of("ADD", "MOVE", "DELETE").contains(normalizedChangeType)) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
        if (!timelineSecurityService.canEditTimeline(timelineId) && !"ADD".equals(normalizedChangeType)) {
            throw new AppException(ErrorCode.TIMELINE_ACCESS_DENIED);
        }
        Timeline timeline = timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));

        TimelineProposal proposal = TimelineProposal.builder()
                .timeline(timeline)
                .author(userRepository.findByUsername(timelineSecurityService.getCurrentUsername())
                        .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST)))
                .baseVersion(baseVersion)
                .changeType(normalizedChangeType)
                .payload(payload)
                .status(TimelineProposalStatus.PENDING)
                .build();

        TimelineProposal savedProposal = timelineProposalRepository.save(proposal);
        publishProposalEventAfterCommit(timelineId, "PROPOSAL_CREATED", proposalPayload(
                timelineId,
                savedProposal.getId(),
                savedProposal.getStatus().name()
        ));
        return savedProposal;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public List<TimelineProposal> getPendingProposals(String timelineId) {
        timelineSecurityService.requireViewAccess(timelineId);
        if (!timelineSecurityService.canEditTimeline(timelineId)) {
            return timelineProposalRepository.findAllByTimelineIdAndStatusAndAuthorUsername(
                    timelineId,
                    TimelineProposalStatus.PENDING,
                    timelineSecurityService.getCurrentUsername()
            );
        }
        return timelineProposalRepository.findAllByTimelineIdAndStatus(timelineId, TimelineProposalStatus.PENDING);
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public void decideProposal(String timelineId, String proposalId, TimelineProposalStatus status) {
        timelineSecurityService.requireEditAccess(timelineId);
        if (status == TimelineProposalStatus.PENDING) {
            throw new AppException(ErrorCode.INVALID_PROPOSAL_DATA);
        }
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

        // Broadcast decision to clear shadow object on all clients
        publishProposalEventAfterCommit(timelineId, "PROPOSAL_DECIDED", proposalPayload(
                timelineId,
                proposalId,
                status.name()
        ));
    }

    private Map<String, Object> proposalPayload(String timelineId, String proposalId, String status) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("timelineId", timelineId);
        payload.put("id", proposalId);
        payload.put("status", status);
        payload.put("refetch", true);
        String actorUsername = timelineSecurityService.getCurrentUsername();
        if (actorUsername != null) {
            payload.put("actor", actorUsername);
        }
        return payload;
    }

    private void publishProposalEventAfterCommit(String timelineId, String type, Object data) {
        Runnable publishTask = () -> timelineEventPublisher.publishEvent(timelineId, type, data);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    publishTask.run();
                }
            });
            return;
        }

        publishTask.run();
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
