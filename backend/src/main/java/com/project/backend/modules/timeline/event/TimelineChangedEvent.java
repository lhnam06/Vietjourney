package com.project.backend.modules.timeline.event;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Getter
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineChangedEvent {
    String timelineId;
    String timelineTitle;
    String actorUsername;
    TimelineChangeType changeType;
    Set<String> recipientUsernames;
}
