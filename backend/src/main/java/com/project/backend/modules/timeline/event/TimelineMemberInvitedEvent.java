package com.project.backend.modules.timeline.event;

import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

@Getter
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineMemberInvitedEvent {
    String timelineId;
    String timelineTitle;
    String actorUsername;
    String invitedUsername;
    TimelineMemberRole role;
}
