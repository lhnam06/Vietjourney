package com.project.backend.modules.timeline.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResizeTimelineEventRequest {
    @NotNull
    LocalDateTime startTime;

    @NotNull
    LocalDateTime endTime;
}
