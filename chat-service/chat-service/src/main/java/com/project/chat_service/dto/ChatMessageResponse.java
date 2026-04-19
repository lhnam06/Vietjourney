package com.project.chat_service.dto;

import com.project.chat_service.entity.Message;
import com.project.chat_service.entity.MessageType;

import java.time.Instant;

public record ChatMessageResponse(
        String id,
        String roomId,
        String senderId,
        String content,
        MessageType type,
        Instant sentAt
) {
    public static ChatMessageResponse from(Message message) {
        return new ChatMessageResponse(
                message.getId(),
                message.getChatRoom().getId(),
                message.getSenderId(),
                message.getContent(),
                message.getType(),
                message.getSentAt()
        );
    }
}
