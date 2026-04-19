package com.project.chat_service.dto;

import com.project.chat_service.entity.ChatRoom;
import com.project.chat_service.entity.ChatRoomType;

import java.time.Instant;
import java.util.Set;

public record ChatRoomResponse(
        String id,
        String name,
        ChatRoomType type,
        Set<String> participantIds,
        Instant createdAt
) {
    public static ChatRoomResponse from(ChatRoom chatRoom) {
        return new ChatRoomResponse(
                chatRoom.getId(),
                chatRoom.getName(),
                chatRoom.getType(),
                chatRoom.getParticipantIds(),
                chatRoom.getCreatedAt()
        );
    }
}
