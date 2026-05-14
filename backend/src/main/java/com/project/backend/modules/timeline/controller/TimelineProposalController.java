package com.project.backend.modules.timeline.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.timeline.dto.request.SubmitProposalRequest;
import com.project.backend.modules.timeline.dto.response.TimelineProposalResponse;
import com.project.backend.modules.timeline.entity.TimelineProposal;
import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.service.TimelineProposalService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

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
                .result(mapToResponse(proposal))
                .build();
    }

    @GetMapping
    public ApiResponse<List<TimelineProposalResponse>> getPendingProposals(
            @PathVariable String timelineId) {
        List<TimelineProposal> proposals = timelineProposalService.getPendingProposals(timelineId);
        return ApiResponse.<List<TimelineProposalResponse>>builder()
                .result(proposals.stream().map(this::mapToResponse).collect(Collectors.toList()))
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

    private TimelineProposalResponse mapToResponse(TimelineProposal proposal) {
        return TimelineProposalResponse.builder()
                .id(proposal.getId())
                .timelineId(proposal.getTimeline().getId())
                .authorId(proposal.getAuthor().getId())
                .authorUsername(proposal.getAuthor().getUsername())
                .baseVersion(proposal.getBaseVersion())
                .changeType(proposal.getChangeType())
                .payload(proposal.getPayload())
                .status(proposal.getStatus())
                .createdAt(proposal.getCreatedAt())
                .build();
    }
}
