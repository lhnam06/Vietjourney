package com.project.backend.modules.place.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.place.dto.request.PlaceFilterRequest;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.service.PlaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/places")
@RequiredArgsConstructor
public class PlaceController {

    private final PlaceService placeService;

    @PostMapping("/filter")
    public ApiResponse<PageResponse<PlaceResponse>> filterPlaces(
            @RequestBody PlaceFilterRequest request) {

        return ApiResponse.<PageResponse<PlaceResponse>>builder()
                .result(placeService.filterPlaces(request))
                .build();
    }
}