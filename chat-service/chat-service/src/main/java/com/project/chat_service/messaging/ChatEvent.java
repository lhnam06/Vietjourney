package com.project.chat_service.messaging;

import com.project.chat_service.entity.ChatRoomType;
import com.project.chat_service.entity.MessageType;

import java.time.Instant;
import java.util.Set;

public record ChatEvent(
        String messageId,
        String roomId,
        ChatRoomType roomType,
        Set<String> participantIds,
        String senderId,
        String content,
        MessageType type,
        Instant sentAt
) {
}
