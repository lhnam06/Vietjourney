package com.project.backend.modules.search.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.search.dto.request.LexicalSearchRequest;
import com.project.backend.modules.search.service.LexicalSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class LexicalSearchController {
    private final LexicalSearchService lexicalSearchService;

    @GetMapping("/lexical")
    public ApiResponse<PageResponse<PlaceResponse>> lexicalSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        LexicalSearchRequest request = LexicalSearchRequest.builder()
                .query(query)
                .category(category)
                .district(district)
                .page(page)
                .size(size)
                .build();

        return ApiResponse.<PageResponse<PlaceResponse>>builder()
                .result(lexicalSearchService.search(request))
                .build();
    }
}
