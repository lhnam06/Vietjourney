package com.project.backend.modules.timeline.dto.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineProposalReviewPageResponse {
    List<TimelineProposalResponse> content;
    long totalElements;
    int totalPages;
    int number;
    int size;
    TimelineProposalReviewSummaryResponse summary;
}
