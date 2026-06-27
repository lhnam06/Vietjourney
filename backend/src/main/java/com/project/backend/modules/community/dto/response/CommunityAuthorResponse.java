package com.project.backend.modules.community.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommunityAuthorResponse {
    String id;
    String username;
    String displayName;
    Boolean verified;
    Boolean followedByMe;
    Long followerCount;
    Long postCount;
}
