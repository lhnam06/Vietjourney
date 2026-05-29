package com.project.backend.modules.search.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.search.dto.request.HybridSearchRequest;
import com.project.backend.modules.search.dto.response.EmbeddingReindexResponse;
import com.project.backend.modules.search.service.HybridSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class HybridSearchController {
    private final HybridSearchService hybridSearchService;

    @GetMapping("/hybrid")
    public ApiResponse<PageResponse<PlaceResponse>> hybridSearch(
            @RequestParam("q") String query,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "district", required = false) String district,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size
    ) {
        HybridSearchRequest request = HybridSearchRequest.builder()
                .query(query)
                .category(category)
                .district(district)
                .page(page)
                .size(size)
                .build();

        return ApiResponse.<PageResponse<PlaceResponse>>builder()
                .result(hybridSearchService.search(request))
                .build();
    }

    @PostMapping("/hybrid/reindex")
    public ApiResponse<EmbeddingReindexResponse> reindexEmbeddings(
            @RequestParam(value = "limit", defaultValue = "200") int limit
    ) {
        return ApiResponse.<EmbeddingReindexResponse>builder()
                .result(hybridSearchService.reindexMissingEmbeddings(limit))
                .build();
    }
}
