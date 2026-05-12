package com.project.backend.modules.timeline.dto.request;

import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetTimelineInviteCodeRequest {
    @NotNull
    TimelineMemberRole role;

    @Min(1)
    @Max(5000)
    Integer maxUses;

    @Min(1)
    @Max(24 * 30)
    Integer expiresInHours;
}
