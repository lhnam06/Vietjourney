package com.project.backend.modules.chat.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ChatMessageResponse {
    String id;
    String timelineId;
    String senderId;
    String senderUsername;
    String content;
    LocalDateTime timestamp;
}
