package com.project.backend.modules.community.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommunityPostResponse {
    String id;
    String timelineId;
    String title;
    String caption;
    LocalDate startDate;
    LocalDate endDate;
    CommunityAuthorResponse author;
    List<String> tags;
    List<String> images;
    List<CommunityItineraryDayResponse> itinerary;
    Long likeCount;
    Long commentCount;
    Long saveCount;
    Integer copyCount;
    Double ratingAverage;
    Long ratingCount;
    Boolean likedByMe;
    Boolean savedByMe;
    LocalDateTime createdAt;
}
