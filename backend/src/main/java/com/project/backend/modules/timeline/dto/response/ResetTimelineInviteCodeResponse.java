package com.project.backend.modules.timeline.dto.response;

import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ResetTimelineInviteCodeResponse {
    String timelineId;
    String timelineTitle;
    String code;
    TimelineMemberRole role;
    int maxUses;
    LocalDateTime expiresAt;
}
