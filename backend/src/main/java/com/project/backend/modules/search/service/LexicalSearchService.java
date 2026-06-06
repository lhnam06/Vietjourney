package com.project.backend.modules.search.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.search.config.LexicalSearchProperties;
import com.project.backend.modules.search.config.SearchNormalizer;
import com.project.backend.modules.search.dto.request.LexicalSearchRequest;
import com.project.backend.modules.search.repository.LexicalSearchRepository;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LexicalSearchService {
    private static final Set<String> VALID_CATEGORIES = Set.of("food", "drink", "activity");

    private final LexicalSearchRepository lexicalSearchRepository;
    private final LexicalSearchProperties properties;
    private final SearchSynonymService searchSynonymService;
    private final PlaceMapper placeMapper;

    public PageResponse<PlaceResponse> search(LexicalSearchRequest request) {
        normalizeRequest(request);

        String normalizedQuery = SearchNormalizer.normalize(request.getQuery());
        if (normalizedQuery.isBlank()) {
            return PageResponse.<PlaceResponse>builder()
                    .data(List.of())
                    .total(0)
                    .page(request.getPage())
                    .size(request.getSize())
                    .totalPages(0)
                    .build();
        }

        List<String> expandedTerms = searchSynonymService.expand(normalizedQuery);
        List<Tuple> rows = lexicalSearchRepository.search(
                request,
                normalizedQuery,
                expandedTerms,
                properties.getKeywordThreshold()
        );
        long total = lexicalSearchRepository.count(
                request,
                normalizedQuery,
                expandedTerms,
                properties.getKeywordThreshold()
        );

        List<PlaceResponse> data = rows.stream()
                .map(placeMapper::toResponse)
                .toList();

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / request.getSize());

        return PageResponse.<PlaceResponse>builder()
                .data(data)
                .total(total)
                .page(request.getPage())
                .size(request.getSize())
                .totalPages(totalPages)
                .build();
    }

    private void normalizeRequest(LexicalSearchRequest request) {
        if (request.getPage() < 0) {
            request.setPage(0);
        }
        if (request.getSize() <= 0 || request.getSize() > properties.getMaxPageSize()) {
            request.setSize(10);
        }

        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            String normalizedCategory = request.getCategory().trim().toLowerCase();
            if (!VALID_CATEGORIES.contains(normalizedCategory)) {
                throw new AppException(ErrorCode.INVALID_CATEGORY);
            }
            request.setCategory(normalizedCategory);
        }
    }
}
