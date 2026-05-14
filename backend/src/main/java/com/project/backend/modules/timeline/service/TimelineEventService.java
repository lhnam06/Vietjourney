package com.project.backend.modules.timeline.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.ReorderTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.ResizeTimelineEventRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.event.TimelineChangeType;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineEventService {
    TimelineRepository timelineRepository;
    TimelineEventRepository timelineEventRepository;
    TimelineSecurityService timelineSecurityService;
    TimelineService timelineService;
    PlaceLookupService placeLookupService;
    com.project.backend.modules.timeline.messaging.TimelineEventPublisher timelineEventPublisher;

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public TimelineEventResponse getEvent(String timelineId, String eventId) {
        timelineSecurityService.requireViewAccess(timelineId);
        return timelineService.toEventResponse(getEventOrThrow(timelineId, eventId));
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineEventResponse addEvent(String timelineId, CreateTimelineEventRequest request) {
        timelineSecurityService.requireEditAccess(timelineId);
        Timeline timeline = timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));

        placeLookupService.assertPlaceExists(request.getCategory(), request.getExternalPlaceId());
        validateEventWindow(timeline, request.getStartTime(), request.getEndTime(), null);

        TimelineEvent event = TimelineEvent.builder()
                .timeline(timeline)
                .externalPlaceId(request.getExternalPlaceId())
                .category(request.getCategory() == null ? TimelineEventCategory.ACTIVITY : request.getCategory())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .orderIndex(request.getOrderIndex() == null ? Integer.MAX_VALUE : request.getOrderIndex())
                .notes(request.getNotes())
                .status(request.getStatus() == null ? TimelineEventStatus.PLANNED : request.getStatus())
                .build();
        event = timelineEventRepository.save(event);

        normalizeDay(timelineId, event.getStartTime().toLocalDate(), event.getId(), request.getOrderIndex());
        timelineService.publishTimelineChangedEvent(timeline, TimelineChangeType.EVENT_ADDED);
        TimelineEventResponse response = timelineService.toEventResponse(timelineEventRepository.findById(event.getId())
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_EVENT_NOT_EXIST)));
        timelineEventPublisher.publishEvent(timelineId, "EVENT_ADDED", response);
        return response;
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineEventResponse moveEvent(String timelineId, String eventId, MoveTimelineEventRequest request) {
        timelineSecurityService.requireEditAccess(timelineId);
        Timeline timeline = timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        TimelineEvent event = getEventOrThrow(timelineId, eventId);
        LocalDate originalDay = event.getStartTime().toLocalDate();

        validateEventWindow(timeline, request.getStartTime(), request.getEndTime(), eventId);

        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setOrderIndex(request.getOrderIndex() == null ? event.getOrderIndex() : request.getOrderIndex());
        timelineEventRepository.save(event);

        normalizeDay(timelineId, originalDay, null, null);
        normalizeDay(timelineId, event.getStartTime().toLocalDate(), eventId, request.getOrderIndex());
        timelineService.publishTimelineChangedEvent(timeline, TimelineChangeType.EVENT_MOVED);

        TimelineEventResponse response = timelineService.toEventResponse(event);
        timelineEventPublisher.publishEvent(timelineId, "EVENT_MOVED", response);
        return response;
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineEventResponse resizeEvent(String timelineId, String eventId, ResizeTimelineEventRequest request) {
        timelineSecurityService.requireEditAccess(timelineId);
        Timeline timeline = timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        TimelineEvent event = getEventOrThrow(timelineId, eventId);

        validateEventWindow(timeline, request.getStartTime(), request.getEndTime(), eventId);

        LocalDate originalDay = event.getStartTime().toLocalDate();
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        timelineEventRepository.save(event);

        normalizeDay(timelineId, originalDay, eventId, event.getOrderIndex());
        if (!originalDay.equals(event.getStartTime().toLocalDate())) {
            normalizeDay(timelineId, event.getStartTime().toLocalDate(), eventId, event.getOrderIndex());
        }
        timelineService.publishTimelineChangedEvent(timeline, TimelineChangeType.EVENT_RESIZED);

        TimelineEventResponse response = timelineService.toEventResponse(event);
        timelineEventPublisher.publishEvent(timelineId, "EVENT_RESIZED", response);
        return response;
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public TimelineEventResponse reorderEvent(String timelineId, String eventId, ReorderTimelineEventRequest request) {
        timelineSecurityService.requireEditAccess(timelineId);
        timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        TimelineEvent event = getEventOrThrow(timelineId, eventId);

        normalizeDay(timelineId, event.getStartTime().toLocalDate(), eventId, request.getOrderIndex());
        timelineService.publishTimelineChangedEvent(event.getTimeline(), TimelineChangeType.EVENT_REORDERED);
        TimelineEventResponse response = timelineService.toEventResponse(getEventOrThrow(timelineId, eventId));
        timelineEventPublisher.publishEvent(timelineId, "EVENT_REORDERED", response);
        return response;
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public void deleteEvent(String timelineId, String eventId) {
        timelineSecurityService.requireEditAccess(timelineId);
        timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        TimelineEvent event = getEventOrThrow(timelineId, eventId);
        LocalDate eventDay = event.getStartTime().toLocalDate();
        Timeline timeline = event.getTimeline();
        timelineEventRepository.delete(event);
        normalizeDay(timelineId, eventDay, null, null);
        timelineService.publishTimelineChangedEvent(timeline, TimelineChangeType.EVENT_DELETED);
        timelineEventPublisher.publishEvent(timelineId, "EVENT_DELETED", java.util.Map.of("eventId", eventId));
    }

    private TimelineEvent getEventOrThrow(String timelineId, String eventId) {
        return timelineEventRepository.findByIdAndTimelineId(eventId, timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_EVENT_NOT_EXIST));
    }

    private void validateEventWindow(Timeline timeline, LocalDateTime startTime, LocalDateTime endTime, String eventId) {
        if (startTime == null || endTime == null || !startTime.isBefore(endTime)) {
            throw new AppException(ErrorCode.INVALID_TIMELINE_EVENT_RANGE);
        }

        LocalDateTime allowedStart = timeline.getStartDate().atStartOfDay();
        LocalDateTime allowedEndExclusive = timeline.getEndDate().plusDays(1).atStartOfDay();
        if (startTime.isBefore(allowedStart) || endTime.isAfter(allowedEndExclusive)) {
            throw new AppException(ErrorCode.TIMELINE_EVENT_OUTSIDE_TIMELINE_RANGE);
        }

        boolean overlapping = timelineEventRepository.existsOverlappingEvent(
                timeline.getId(),
                eventId,
                startTime,
                endTime,
                TimelineEventStatus.CANCELLED
        );
        if (overlapping) {
            throw new AppException(ErrorCode.TIMELINE_EVENT_OVERLAP);
        }
    }

    private void normalizeDay(String timelineId, LocalDate day, String prioritizedEventId, Integer targetIndex) {
        List<TimelineEvent> dayEvents = new ArrayList<>(timelineEventRepository.findDayEventsForUpdate(
                timelineId,
                day.atStartOfDay(),
                day.plusDays(1).atStartOfDay(),
                TimelineEventStatus.CANCELLED
        ));
        if (dayEvents.isEmpty()) {
            return;
        }

        dayEvents.sort(Comparator
                .comparing(TimelineEvent::getOrderIndex, Comparator.nullsLast(Integer::compareTo))
                .thenComparing(TimelineEvent::getStartTime)
                .thenComparing(TimelineEvent::getId));

        if (prioritizedEventId != null) {
            TimelineEvent prioritizedEvent = dayEvents.stream()
                    .filter(event -> event.getId().equals(prioritizedEventId))
                    .findFirst()
                    .orElse(null);
            if (prioritizedEvent != null) {
                dayEvents.remove(prioritizedEvent);
                int insertAt = targetIndex == null ? dayEvents.size() : Math.max(0, Math.min(targetIndex, dayEvents.size()));
                dayEvents.add(insertAt, prioritizedEvent);
            }
        }

        for (int i = 0; i < dayEvents.size(); i++) {
            dayEvents.get(i).setOrderIndex(i);
        }
        timelineEventRepository.saveAll(dayEvents);
    }
}
