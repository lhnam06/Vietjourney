package com.project.backend.modules.timeline.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.common.exception.AppException;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.dto.request.UpdateTimelineProposalScheduleRequest;
import com.project.backend.modules.timeline.dto.response.TimelineProposalReviewPageResponse;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineProposalReviewState;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineProposalRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TimelineProposalServiceTest {
    @Mock TimelineProposalRepository timelineProposalRepository;
    @Mock TimelineRepository timelineRepository;
    @Mock TimelineEventRepository timelineEventRepository;
    @Mock UserRepository userRepository;
    @Mock TimelineSecurityService timelineSecurityService;
    @Mock TimelineEventService timelineEventService;
    @Mock TimelineEventPublisher timelineEventPublisher;
    @Mock PlaceLookupService placeLookupService;
    @Mock ObjectMapper objectMapper;

    @InjectMocks TimelineProposalService service;

    Timeline timeline;
    User member;

    @BeforeEach
    void setUp() {
        timeline = Timeline.builder()
                .id("timeline-1")
                .title("Da Nang")
                .startDate(LocalDate.of(2026, 6, 20))
                .endDate(LocalDate.of(2026, 6, 27))
                .version(1)
                .build();
        member = User.builder().id("user-1").username("member").build();
    }

    @Test
    void reviewPageBuildsMutuallyExclusiveSummaryStates() {
        TimelineProposal ready = proposal("ready", TimelineProposalStatus.PENDING, timedPayload("2026-06-22T09:00:00", "2026-06-22T10:00:00"));
        TimelineProposal conflict = proposal("conflict", TimelineProposalStatus.PENDING, timedPayload("2026-06-22T11:00:00", "2026-06-22T12:00:00"));
        TimelineProposal unscheduled = proposal("unscheduled", TimelineProposalStatus.PENDING, basePayload());
        TimelineProposal processed = proposal("processed", TimelineProposalStatus.ACCEPTED, timedPayload("2026-06-23T09:00:00", "2026-06-23T10:00:00"));
        TimelineEvent existing = TimelineEvent.builder()
                .id("event-1")
                .timeline(timeline)
                .externalPlaceId("existing-place")
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(LocalDateTime.parse("2026-06-22T11:30:00"))
                .endTime(LocalDateTime.parse("2026-06-22T12:30:00"))
                .status(TimelineEventStatus.PLANNED)
                .build();

        when(timelineRepository.findById("timeline-1")).thenReturn(Optional.of(timeline));
        when(timelineSecurityService.canEditTimeline("timeline-1")).thenReturn(true);
        when(timelineProposalRepository.findAllByTimelineIdOrderByCreatedAtDesc("timeline-1"))
                .thenReturn(List.of(ready, conflict, unscheduled, processed));
        when(timelineEventRepository.findTimelineEventsInRange(eq("timeline-1"), any(), any()))
                .thenReturn(List.of(existing));

        TimelineProposalReviewPageResponse page = service.getReviewPage("timeline-1", null, null, 0, 20);

        assertEquals(4, page.getTotalElements());
        assertEquals(1, page.getSummary().getReady());
        assertEquals(1, page.getSummary().getConflict());
        assertEquals(1, page.getSummary().getUnscheduled());
        assertEquals(1, page.getSummary().getProcessed());
        assertEquals(2, page.getSummary().getByDate().get(0).getCount());
    }

    @Test
    void viewerReviewPageOnlyQueriesOwnProposals() {
        when(timelineRepository.findById("timeline-1")).thenReturn(Optional.of(timeline));
        when(timelineSecurityService.canEditTimeline("timeline-1")).thenReturn(false);
        when(timelineSecurityService.getCurrentUsername()).thenReturn("member");
        when(timelineProposalRepository.findAllByTimelineIdAndAuthorUsernameOrderByCreatedAtDesc("timeline-1", "member"))
                .thenReturn(List.of());
        when(timelineEventRepository.findTimelineEventsInRange(eq("timeline-1"), any(), any()))
                .thenReturn(List.of());

        service.getReviewPage("timeline-1", null, null, 0, 20);

        verify(timelineProposalRepository, never()).findAllByTimelineIdOrderByCreatedAtDesc("timeline-1");
        verify(timelineProposalRepository).findAllByTimelineIdAndAuthorUsernameOrderByCreatedAtDesc("timeline-1", "member");
    }

    @Test
    void viewerCanSubmitUnscheduledAddProposal() {
        when(timelineRepository.findById("timeline-1")).thenReturn(Optional.of(timeline));
        when(timelineSecurityService.canEditTimeline("timeline-1")).thenReturn(false);
        when(timelineSecurityService.getCurrentUsername()).thenReturn("member");
        when(userRepository.findByUsername("member")).thenReturn(Optional.of(member));
        when(timelineProposalRepository.save(any(TimelineProposal.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        TimelineProposal saved = service.submitProposal("timeline-1", "ADD", basePayload(), 1);

        assertEquals(TimelineProposalStatus.PENDING, saved.getStatus());
        assertFalse(saved.getPayload().containsKey("startTime"));
        verify(timelineEventPublisher).publishEvent(eq("timeline-1"), eq("PROPOSAL_CREATED"), any());
    }

    @Test
    void scheduleUpdatePublishesProposalUpdatedEvent() {
        TimelineProposal unscheduled = proposal("proposal-1", TimelineProposalStatus.PENDING, basePayload());
        when(timelineProposalRepository.findById("proposal-1")).thenReturn(Optional.of(unscheduled));
        when(timelineProposalRepository.saveAndFlush(unscheduled)).thenReturn(unscheduled);
        when(timelineEventRepository.findTimelineEventsInRange(eq("timeline-1"), any(), any()))
                .thenReturn(List.of());
        when(timelineSecurityService.getCurrentUsername()).thenReturn("owner");

        service.updateSchedule(
                "timeline-1",
                "proposal-1",
                UpdateTimelineProposalScheduleRequest.builder()
                        .startTime(LocalDateTime.parse("2026-06-24T09:00:00"))
                        .endTime(LocalDateTime.parse("2026-06-24T10:30:00"))
                        .build()
        );

        assertEquals("2026-06-24T09:00", unscheduled.getPayload().get("startTime"));
        verify(timelineEventPublisher).publishEvent(eq("timeline-1"), eq("PROPOSAL_UPDATED"), any());
    }

    @Test
    void conflictingProposalCannotBeAccepted() {
        TimelineProposal proposal = proposal(
                "proposal-1",
                TimelineProposalStatus.PENDING,
                timedPayload("2026-06-22T09:00:00", "2026-06-22T10:00:00")
        );
        TimelineEvent existing = TimelineEvent.builder()
                .id("event-1")
                .timeline(timeline)
                .externalPlaceId("existing-place")
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(LocalDateTime.parse("2026-06-22T09:30:00"))
                .endTime(LocalDateTime.parse("2026-06-22T10:30:00"))
                .status(TimelineEventStatus.PLANNED)
                .build();
        when(timelineProposalRepository.findById("proposal-1")).thenReturn(Optional.of(proposal));
        when(timelineEventRepository.findTimelineEventsInRange(eq("timeline-1"), any(), any()))
                .thenReturn(List.of(existing));

        assertThrows(
                AppException.class,
                () -> service.decideProposal("timeline-1", "proposal-1", TimelineProposalStatus.ACCEPTED)
        );
        assertEquals(TimelineProposalStatus.PENDING, proposal.getStatus());
        verify(timelineEventService, never()).addEvent(eq("timeline-1"), any());
    }

    private TimelineProposal proposal(String id, TimelineProposalStatus status, Map<String, Object> payload) {
        return TimelineProposal.builder()
                .id(id)
                .timeline(timeline)
                .author(member)
                .baseVersion(1)
                .changeType("ADD")
                .payload(payload)
                .status(status)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private Map<String, Object> basePayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("externalPlaceId", "place-1");
        payload.put("category", "ACTIVITY");
        payload.put("status", "PLANNED");
        return payload;
    }

    private Map<String, Object> timedPayload(String startTime, String endTime) {
        Map<String, Object> payload = basePayload();
        payload.put("startTime", startTime);
        payload.put("endTime", endTime);
        return payload;
    }
}
