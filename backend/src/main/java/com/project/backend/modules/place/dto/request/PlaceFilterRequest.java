package com.project.backend.modules.place.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlaceFilterRequest {

    String category;

    String district;

    Map<String, List<String>> tags;

    Integer minPrice;
    Integer maxPrice;

    Double minRating;

    @Builder.Default
    int page = 0;

    @Builder.Default
    int size = 20;
}