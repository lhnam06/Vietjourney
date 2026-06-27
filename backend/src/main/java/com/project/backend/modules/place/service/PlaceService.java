package com.project.backend.modules.place.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.place.dto.request.PlaceFilterRequest;
import com.project.backend.modules.place.dto.response.DistrictSummaryResponse;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.place.repository.PlaceQueryRepository;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class PlaceService {

    private final PlaceQueryRepository placeQueryRepository;
    private final PlaceMapper placeMapper;

    private static final Set<String> VALID_CATEGORIES = Set.of("food", "drink", "activity");

    public PageResponse<PlaceResponse> filterPlaces(PlaceFilterRequest request) {
        validateRequest(request);

        List<Tuple> rows = placeQueryRepository.findByFilter(request);
        long total = extractTotal(rows, request);

        List<PlaceResponse> data = rows.stream()
                .map(placeMapper::toResponse)
                .toList();

        int totalPages = (int) Math.ceil((double) total / request.getSize());

        return PageResponse.<PlaceResponse>builder()
                .data(data)
                .total(total)
                .page(request.getPage())
                .size(request.getSize())
                .totalPages(totalPages)
                .build();
    }

    public List<DistrictSummaryResponse> findDistricts(PlaceFilterRequest request) {
        validateRequest(request);

        return placeQueryRepository.findDistrictsByFilter(request).stream()
                .map(row -> DistrictSummaryResponse.builder()
                        .name(row.get("name", String.class))
                        .count(((Number) row.get("count")).longValue())
                        .build())
                .toList();
    }

    private long extractTotal(List<Tuple> rows, PlaceFilterRequest request) {
        if (!rows.isEmpty()) {
            Object rawTotal = rows.get(0).get("total_count");
            if (rawTotal instanceof Number number) {
                return number.longValue();
            }
        }
        return placeQueryRepository.countByFilter(request);
    }

    private void validateRequest(PlaceFilterRequest req) {
        // Validate category nếu có
        if (req.getCategory() != null && !req.getCategory().isBlank()) {
            if (!VALID_CATEGORIES.contains(req.getCategory().toLowerCase())) {
                throw new AppException(ErrorCode.INVALID_CATEGORY);
            }
        }

        // Page, size
        if (req.getPage() < 0) req.setPage(0);
        if (req.getSize() <= 0 || req.getSize() > 100) req.setSize(20);

        // Validate price range
        if (req.getMinPrice() != null && req.getMaxPrice() != null
                && req.getMinPrice() > req.getMaxPrice()) {
            throw new AppException(ErrorCode.INVALID_PRICE_RANGE);
        }
    }
}
