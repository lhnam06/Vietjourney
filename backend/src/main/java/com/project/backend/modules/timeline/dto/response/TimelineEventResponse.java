package com.project.backend.modules.timeline.dto.response;

import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineEventResponse {
    String id;
    String externalPlaceId;
    TimelinePlaceResponse place;
    TimelineEventCategory category;
    LocalDateTime startTime;
    LocalDateTime endTime;
    Integer orderIndex;
    String notes;
    TimelineEventStatus status;
    Long version;
}
