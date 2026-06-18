package com.project.backend.modules.timeline.service;

import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TimelineEventServiceTest {

    private static final String TEST_TIMELINE_ID = "3f973731-fe01-4a12-b8c2-3d76793505cd";
    private static final String TEST_EXTERNAL_PLACE_ID = "test_place_123";
    private static final String TEST_EVENT_ID = "generated-event-id-123";

    @Mock
    TimelineRepository timelineRepository;

    @Mock
    TimelineEventRepository timelineEventRepository;

    @Mock
    TimelineSecurityService timelineSecurityService;

    @Mock
    TimelineService timelineService;

    @Mock
    PlaceLookupService placeLookupService;

    @Mock
    TimelineEventPublisher timelineEventPublisher;

    @InjectMocks
    TimelineEventService timelineEventService;

    private Timeline mockTimeline;
    private TimelineEvent savedEvent;

    @BeforeEach
    void setUp() {
        mockTimeline = Timeline.builder()
                .id(TEST_TIMELINE_ID)
                .title("Test Trip")
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(7))
                .build();

        savedEvent = TimelineEvent.builder()
                .id(TEST_EVENT_ID)
                .timeline(mockTimeline)
                .externalPlaceId(TEST_EXTERNAL_PLACE_ID)
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(LocalDateTime.now().plusHours(1))
                .endTime(LocalDateTime.now().plusHours(3))
                .orderIndex(0)
                .status(TimelineEventStatus.PLANNED)
                .build();
    }

    @Test
    void addEvent_shouldSaveEventSuccessfully() {
        // Arrange
        CreateTimelineEventRequest request = CreateTimelineEventRequest.builder()
                .externalPlaceId(TEST_EXTERNAL_PLACE_ID)
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(LocalDateTime.now().plusHours(1))
                .endTime(LocalDateTime.now().plusHours(3))
                .orderIndex(0)
                .status(TimelineEventStatus.PLANNED)
                .build();

        TimelineEventResponse mockResponse = TimelineEventResponse.builder()
                .id(TEST_EVENT_ID)
                .externalPlaceId(TEST_EXTERNAL_PLACE_ID)
                .category(TimelineEventCategory.ACTIVITY)
                .status(TimelineEventStatus.PLANNED)
                .build();

        doNothing().when(timelineSecurityService).requireEditAccess(TEST_TIMELINE_ID);
        when(timelineRepository.findByIdForUpdate(TEST_TIMELINE_ID)).thenReturn(Optional.of(mockTimeline));
        doNothing().when(placeLookupService).assertPlaceExists(any(), any());
        when(timelineEventRepository.findOverlappingEvents(eq(TEST_TIMELINE_ID), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(timelineEventRepository.save(any(TimelineEvent.class))).thenReturn(savedEvent);
        when(timelineEventRepository.findById(TEST_EVENT_ID)).thenReturn(Optional.of(savedEvent));
        when(timelineEventRepository.findDayEventsForUpdate(eq(TEST_TIMELINE_ID), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(timelineService.toEventResponse(any())).thenReturn(mockResponse);
        doNothing().when(timelineService).publishTimelineChangedEvent(any(), any());
        doNothing().when(timelineEventPublisher).publishEvent(any(), any(), any());

        // Act
        TimelineEventResponse response = timelineEventService.addEvent(TEST_TIMELINE_ID, request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(TEST_EVENT_ID);
        assertThat(response.getExternalPlaceId()).isEqualTo(TEST_EXTERNAL_PLACE_ID);

        verify(timelineEventRepository, times(1)).save(any(TimelineEvent.class));
        verify(timelineEventPublisher, times(1)).publishEvent(eq(TEST_TIMELINE_ID), eq("EVENT_ADDED"), any());
    }

    @Test
    void addEvent_shouldHandlePublisherFailure() {
        // Arrange
        CreateTimelineEventRequest request = CreateTimelineEventRequest.builder()
                .externalPlaceId(TEST_EXTERNAL_PLACE_ID)
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(LocalDateTime.now().plusHours(1))
                .endTime(LocalDateTime.now().plusHours(3))
                .orderIndex(0)
                .status(TimelineEventStatus.PLANNED)
                .build();

        TimelineEventResponse mockResponse = TimelineEventResponse.builder()
                .id(TEST_EVENT_ID)
                .build();

        doNothing().when(timelineSecurityService).requireEditAccess(TEST_TIMELINE_ID);
        when(timelineRepository.findByIdForUpdate(TEST_TIMELINE_ID)).thenReturn(Optional.of(mockTimeline));
        doNothing().when(placeLookupService).assertPlaceExists(any(), any());
        when(timelineEventRepository.findOverlappingEvents(eq(TEST_TIMELINE_ID), any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(timelineEventRepository.save(any(TimelineEvent.class))).thenReturn(savedEvent);
        when(timelineEventRepository.findById(TEST_EVENT_ID)).thenReturn(Optional.of(savedEvent));
        when(timelineEventRepository.findDayEventsForUpdate(eq(TEST_TIMELINE_ID), any(), any(), any()))
                .thenReturn(Collections.emptyList());
        when(timelineService.toEventResponse(any())).thenReturn(mockResponse);
        doNothing().when(timelineService).publishTimelineChangedEvent(any(), any());

        // Simulate Redis/ Publisher failure
        doThrow(new RuntimeException("Redis connection failed"))
                .when(timelineEventPublisher).publishEvent(any(), any(), any());

        // Act
        TimelineEventResponse response = timelineEventService.addEvent(TEST_TIMELINE_ID, request);

        // Assert
        // The event should still be saved even if publisher fails
        assertThat(response).isNotNull();
        verify(timelineEventRepository, times(1)).save(any(TimelineEvent.class));
    }
}
