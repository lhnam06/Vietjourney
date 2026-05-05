package com.project.backend.modules.recommendation.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.recommendation.dto.request.PlaceInteractionBatchRequest;
import com.project.backend.modules.recommendation.dto.request.PlaceInteractionRequest;
import com.project.backend.modules.recommendation.dto.response.InteractionRecordedResponse;
import com.project.backend.modules.recommendation.dto.response.RecommendedPlaceResponse;
import com.project.backend.modules.recommendation.dto.response.UserProfileResponse;
import com.project.backend.modules.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {
    private final RecommendationService recommendationService;

    @PostMapping("/interactions")
    public ApiResponse<InteractionRecordedResponse> recordInteraction(
            @RequestBody @Valid PlaceInteractionRequest request) {
        return ApiResponse.<InteractionRecordedResponse>builder()
                .result(recommendationService.recordInteraction(request))
                .build();
    }

    @PostMapping("/interactions/batch")
    public ApiResponse<InteractionRecordedResponse> recordInteractions(
            @RequestBody @Valid PlaceInteractionBatchRequest request) {
        return ApiResponse.<InteractionRecordedResponse>builder()
                .result(recommendationService.recordInteractions(request))
                .build();
    }

    @GetMapping("/places")
    public ApiResponse<List<RecommendedPlaceResponse>> recommendPlaces(
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.<List<RecommendedPlaceResponse>>builder()
                .result(recommendationService.recommendPlaces(size))
                .build();
    }

    @GetMapping("/profile/me")
    public ApiResponse<UserProfileResponse> getMyProfile() {
        return ApiResponse.<UserProfileResponse>builder()
                .result(recommendationService.getMyProfile())
                .build();
    }
}
