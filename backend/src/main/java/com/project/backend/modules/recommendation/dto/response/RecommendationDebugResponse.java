package com.project.backend.modules.recommendation.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class RecommendationDebugResponse {
    double totalScore;
    double tagScore;
    double districtScore;
    double categoryScore;
    double ratingScore;
    Map<String, Double> matchedTags;
}
