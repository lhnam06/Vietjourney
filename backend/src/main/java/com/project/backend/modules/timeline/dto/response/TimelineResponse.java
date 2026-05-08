package com.project.backend.modules.timeline.dto.response;

import com.project.backend.modules.timeline.enums.TimelineVisibility;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineResponse {
    String id;
    String title;
    String description;
    LocalDate startDate;
    LocalDate endDate;
    TimelineVisibility visibility;
    String ownerId;
    String ownerUsername;
    String ownerDisplayName;
    List<TimelineMemberResponse> members;
    List<TimelineEventResponse> events;
}
