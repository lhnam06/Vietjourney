package com.project.backend.modules.recommendation.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlaceInteractionBatchRequest {
    @Valid
    @NotEmpty
    List<PlaceInteractionRequest> interactions;
}
