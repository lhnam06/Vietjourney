package com.project.backend.modules.timeline.dto.request;

import com.project.backend.modules.timeline.enums.TimelineVisibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpdateTimelineRequest {
    @NotBlank
    String title;

    String description;

    @NotNull
    LocalDate startDate;

    @NotNull
    LocalDate endDate;

    @NotNull
    TimelineVisibility visibility;
}
