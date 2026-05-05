package com.project.backend.modules.recommendation.repository;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecommendationPlaceCandidate {
    String id;
    String name;
    String address;
    String category;
    String district;
    List<String> images;
    Map<String, List<String>> tags;
    Double rating;
    Integer minPrice;
    Integer maxPrice;
    Double latitude;
    Double longitude;
}
