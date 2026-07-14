package com.project.backend.modules.community.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.community.dto.request.CreateCommunityCommentRequest;
import com.project.backend.modules.community.dto.request.CreateCommunityPostRequest;
import com.project.backend.modules.community.dto.request.RateCommunityPostRequest;
import com.project.backend.modules.community.dto.response.*;
import com.project.backend.modules.community.enums.CommunityInteractionType;
import com.project.backend.modules.community.service.CommunityService;
import com.project.backend.modules.timeline.dto.response.TimelineResponse;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/community")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommunityController {
    CommunityService communityService;

    @GetMapping("/posts")
    public ApiResponse<Page<CommunityPostResponse>> getPosts(
            @RequestParam(defaultValue = "FOR_YOU") String tab,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) List<String> tag,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        return ApiResponse.<Page<CommunityPostResponse>>builder()
                .result(communityService.getFeed(
                        tab,
                        query,
                        tag,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
                ))
                .build();
    }

    @GetMapping("/summary")
    public ApiResponse<CommunitySummaryResponse> getSummary() {
        return ApiResponse.<CommunitySummaryResponse>builder()
                .result(communityService.getSummary())
                .build();
    }

    @PostMapping("/posts")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityPostResponse> createPost(@RequestBody @Valid CreateCommunityPostRequest request) {
        return ApiResponse.<CommunityPostResponse>builder()
                .result(communityService.createPost(request))
                .build();
    }

    @PostMapping("/posts/{postId}/like")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityPostResponse> toggleLike(@PathVariable String postId) {
        return ApiResponse.<CommunityPostResponse>builder()
                .result(communityService.toggleInteraction(postId, CommunityInteractionType.LIKE))
                .build();
    }

    @PostMapping("/posts/{postId}/save")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityPostResponse> toggleSave(@PathVariable String postId) {
        return ApiResponse.<CommunityPostResponse>builder()
                .result(communityService.toggleInteraction(postId, CommunityInteractionType.SAVE))
                .build();
    }

    @PostMapping("/posts/{postId}/rating")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityPostResponse> ratePost(
            @PathVariable String postId,
            @RequestBody @Valid RateCommunityPostRequest request
    ) {
        return ApiResponse.<CommunityPostResponse>builder()
                .result(communityService.ratePost(postId, request))
                .build();
    }

    @GetMapping("/posts/{postId}/comments")
    public ApiResponse<List<CommunityCommentResponse>> getComments(@PathVariable String postId) {
        return ApiResponse.<List<CommunityCommentResponse>>builder()
                .result(communityService.getComments(postId))
                .build();
    }

    @PostMapping("/posts/{postId}/comments")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityCommentResponse> createComment(
            @PathVariable String postId,
            @RequestBody @Valid CreateCommunityCommentRequest request
    ) {
        return ApiResponse.<CommunityCommentResponse>builder()
                .result(communityService.createComment(postId, request))
                .build();
    }

    @PostMapping("/posts/{postId}/copy")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<TimelineResponse> copyTimeline(@PathVariable String postId) {
        return ApiResponse.<TimelineResponse>builder()
                .result(communityService.copyTimeline(postId))
                .build();
    }

    @PostMapping("/authors/{authorId}/follow")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityAuthorResponse> toggleFollow(@PathVariable String authorId) {
        return ApiResponse.<CommunityAuthorResponse>builder()
                .result(communityService.toggleFollow(authorId))
                .build();
    }

    @PostMapping("/posts/{postId}/archive")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<CommunityPostResponse> archivePost(@PathVariable String postId) {
        return ApiResponse.<CommunityPostResponse>builder()
                .result(communityService.archivePost(postId))
                .build();
    }

    @DeleteMapping("/posts/{postId}")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<Void> deletePost(@PathVariable String postId) {
        communityService.deletePost(postId);
        return ApiResponse.<Void>builder().build();
    }
}
