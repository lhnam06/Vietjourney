package com.project.backend.modules.community.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CommunityCommentResponse {
    String id;
    CommunityAuthorResponse author;
    String content;
    LocalDateTime createdAt;
}
