package com.project.backend.modules.timeline.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.MoveTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.ReorderTimelineEventRequest;
import com.project.backend.modules.timeline.dto.request.ResizeTimelineEventRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.timeline.service.TimelineEventService;
import com.project.backend.modules.timeline.service.TimelineService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/timelines/{timelineId}/events")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineEventController {
    TimelineEventService timelineEventService;
    TimelineService timelineService;

    @GetMapping
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public ApiResponse<List<TimelineEventResponse>> getEvents(
            @PathVariable String timelineId,
            @RequestParam LocalDateTime rangeStart,
            @RequestParam LocalDateTime rangeEnd
    ) {
        return ApiResponse.<List<TimelineEventResponse>>builder()
                .result(timelineService.getTimelineEvents(timelineId, rangeStart, rangeEnd))
                .build();
    }

    @GetMapping("/{eventId}")
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public ApiResponse<TimelineEventResponse> getEvent(
            @PathVariable String timelineId,
            @PathVariable String eventId
    ) {
        return ApiResponse.<TimelineEventResponse>builder()
                .result(timelineEventService.getEvent(timelineId, eventId))
                .build();
    }

    @PostMapping
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public ApiResponse<TimelineEventResponse> addEvent(
            @PathVariable String timelineId,
            @RequestBody @Valid CreateTimelineEventRequest request
    ) {
        return ApiResponse.<TimelineEventResponse>builder()
                .result(timelineEventService.addEvent(timelineId, request))
                .build();
    }

    @PatchMapping("/{eventId}/move")
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public ApiResponse<TimelineEventResponse> moveEvent(
            @PathVariable String timelineId,
            @PathVariable String eventId,
            @RequestBody @Valid MoveTimelineEventRequest request
    ) {
        return ApiResponse.<TimelineEventResponse>builder()
                .result(timelineEventService.moveEvent(timelineId, eventId, request))
                .build();
    }

    @PatchMapping("/{eventId}/resize")
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public ApiResponse<TimelineEventResponse> resizeEvent(
            @PathVariable String timelineId,
            @PathVariable String eventId,
            @RequestBody @Valid ResizeTimelineEventRequest request
    ) {
        return ApiResponse.<TimelineEventResponse>builder()
                .result(timelineEventService.resizeEvent(timelineId, eventId, request))
                .build();
    }

    @PatchMapping("/{eventId}/reorder")
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public ApiResponse<TimelineEventResponse> reorderEvent(
            @PathVariable String timelineId,
            @PathVariable String eventId,
            @RequestBody @Valid ReorderTimelineEventRequest request
    ) {
        return ApiResponse.<TimelineEventResponse>builder()
                .result(timelineEventService.reorderEvent(timelineId, eventId, request))
                .build();
    }

    @DeleteMapping("/{eventId}")
    @PreAuthorize("@timelineSecurity.canEditTimeline(#timelineId)")
    public ApiResponse<Void> deleteEvent(@PathVariable String timelineId, @PathVariable String eventId) {
        timelineEventService.deleteEvent(timelineId, eventId);
        return ApiResponse.<Void>builder().build();
    }
}
