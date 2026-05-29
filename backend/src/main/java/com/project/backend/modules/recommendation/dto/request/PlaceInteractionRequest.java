package com.project.backend.modules.recommendation.dto.request;

import com.project.backend.modules.recommendation.enums.RecommendationEventType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlaceInteractionRequest {
    @NotBlank
    String placeId;

    @NotBlank
    String category;

    @NotNull
    RecommendationEventType eventType;

    Integer score;

    String district;

    Map<String, List<String>> tags;
}
