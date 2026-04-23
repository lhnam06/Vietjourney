package com.project.backend.modules.timeline.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.timeline.dto.request.CreateTimelineRequest;
import com.project.backend.modules.timeline.dto.request.UpdateTimelineRequest;
import com.project.backend.modules.timeline.dto.request.UpsertTimelineMemberRequest;
import com.project.backend.modules.timeline.dto.response.TimelineMemberResponse;
import com.project.backend.modules.timeline.dto.response.TimelineResponse;
import com.project.backend.modules.timeline.service.TimelineService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/timelines")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineController {
    TimelineService timelineService;

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<TimelineResponse> create(@RequestBody @Valid CreateTimelineRequest request) {
        return ApiResponse.<TimelineResponse>builder()
                .result(timelineService.createTimeline(request))
                .build();
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<List<TimelineResponse>> getMine() {
        return ApiResponse.<List<TimelineResponse>>builder()
                .result(timelineService.getMyTimelines())
                .build();
    }

    @GetMapping("/{timelineId}")
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public ApiResponse<TimelineResponse> getTimeline(@PathVariable String timelineId) {
        return ApiResponse.<TimelineResponse>builder()
                .result(timelineService.getTimeline(timelineId))
                .build();
    }

    @PutMapping("/{timelineId}")
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public ApiResponse<TimelineResponse> update(
            @PathVariable String timelineId,
            @RequestBody @Valid UpdateTimelineRequest request
    ) {
        return ApiResponse.<TimelineResponse>builder()
                .result(timelineService.updateTimeline(timelineId, request))
                .build();
    }

    @PutMapping("/{timelineId}/members")
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public ApiResponse<TimelineMemberResponse> upsertMember(
            @PathVariable String timelineId,
            @RequestBody @Valid UpsertTimelineMemberRequest request
    ) {
        return ApiResponse.<TimelineMemberResponse>builder()
                .result(timelineService.upsertMember(timelineId, request))
                .build();
    }

    @DeleteMapping("/{timelineId}/members/{memberId}")
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public ApiResponse<Void> removeMember(@PathVariable String timelineId, @PathVariable String memberId) {
        timelineService.removeMember(timelineId, memberId);
        return ApiResponse.<Void>builder().build();
    }
}
