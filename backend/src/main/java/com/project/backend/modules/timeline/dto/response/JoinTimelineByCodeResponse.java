package com.project.backend.modules.timeline.dto.response;

import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class JoinTimelineByCodeResponse {
    String timelineId;
    String timelineTitle;
    TimelineMemberRole role;
    boolean alreadyMember;
}
