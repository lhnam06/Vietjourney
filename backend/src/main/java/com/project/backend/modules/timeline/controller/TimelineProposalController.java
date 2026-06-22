package com.project.backend.modules.timeline.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.timeline.dto.request.SubmitProposalRequest;
import com.project.backend.modules.timeline.dto.request.UpdateTimelineProposalScheduleRequest;
import com.project.backend.modules.timeline.dto.response.TimelineProposalResponse;
import com.project.backend.modules.timeline.dto.response.TimelineProposalReviewPageResponse;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalReviewState;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.service.TimelineProposalService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/timelines/{timelineId}/proposals")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineProposalController {
    TimelineProposalService timelineProposalService;

    @PostMapping
    public ApiResponse<TimelineProposalResponse> submitProposal(
            @PathVariable String timelineId,
            @RequestBody @Valid SubmitProposalRequest request) {
        TimelineProposal proposal = timelineProposalService.submitProposal(
                timelineId,
                request.getChangeType(),
                request.getPayload(),
                request.getBaseVersion()
        );
        return ApiResponse.<TimelineProposalResponse>builder()
                .result(timelineProposalService.toResponse(proposal))
                .build();
    }

    @GetMapping
    public ApiResponse<List<TimelineProposalResponse>> getPendingProposals(
            @PathVariable String timelineId) {
        return ApiResponse.<List<TimelineProposalResponse>>builder()
                .result(timelineProposalService.getPendingProposals(timelineId))
                .build();
    }

    @GetMapping("/review")
    public ApiResponse<TimelineProposalReviewPageResponse> getReviewPage(
            @PathVariable String timelineId,
            @RequestParam(required = false) TimelineProposalReviewState state,
            @RequestParam(required = false) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<TimelineProposalReviewPageResponse>builder()
                .result(timelineProposalService.getReviewPage(timelineId, state, date, page, size))
                .build();
    }

    @PatchMapping("/{proposalId}")
    public ApiResponse<TimelineProposalResponse> updateSchedule(
            @PathVariable String timelineId,
            @PathVariable String proposalId,
            @RequestBody @Valid UpdateTimelineProposalScheduleRequest request) {
        return ApiResponse.<TimelineProposalResponse>builder()
                .result(timelineProposalService.updateSchedule(timelineId, proposalId, request))
                .build();
    }

    @PatchMapping("/{proposalId}/decide")
    public ApiResponse<Void> decideProposal(
            @PathVariable String timelineId,
            @PathVariable String proposalId,
            @RequestParam TimelineProposalStatus status) {
        timelineProposalService.decideProposal(timelineId, proposalId, status);
        return ApiResponse.<Void>builder().build();
    }
}
