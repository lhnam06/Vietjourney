package com.project.backend.modules.timeline.dto.request;

import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateTimelineEventRequest {
    @NotBlank
    String externalPlaceId;

    @NotNull
    @Builder.Default
    TimelineEventCategory category = TimelineEventCategory.ACTIVITY;

    @NotNull
    LocalDateTime startTime;

    @NotNull
    LocalDateTime endTime;

    Integer orderIndex;

    String notes;

    @Builder.Default
    TimelineEventStatus status = TimelineEventStatus.PLANNED;
}
