package com.project.backend.modules.timeline.dto.response;

import com.project.backend.modules.timeline.enums.TimelineProposalStatus;
import com.project.backend.modules.timeline.enums.TimelineProposalReviewState;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineProposalResponse {
    String id;
    String timelineId;
    String authorId;
    String authorUsername;
    Integer baseVersion;
    String changeType;
    Map<String, Object> payload;
    TimelineProposalStatus status;
    TimelineProposalReviewState reviewState;
    String placeName;
    String placeAddress;
    String conflictEventId;
    String conflictReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
