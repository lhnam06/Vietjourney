package com.project.backend.modules.timeline.dto.request;

import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UpsertTimelineMemberRequest {
    @NotBlank
    String username;

    @NotNull
    TimelineMemberRole role;
}
