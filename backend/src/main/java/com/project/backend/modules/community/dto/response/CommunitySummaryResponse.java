package com.project.backend.modules.community.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommunitySummaryResponse {
    List<CommunityTagResponse> trendingTags;
    List<CommunityAuthorResponse> featuredCreators;
    List<CommunityPostResponse> hotTimelines;
}
