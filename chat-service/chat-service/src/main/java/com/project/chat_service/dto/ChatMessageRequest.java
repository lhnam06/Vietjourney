package com.project.chat_service.dto;

import com.project.chat_service.entity.MessageType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ChatMessageRequest(
        @NotBlank String roomId,
        @NotBlank String senderId,
        @NotBlank String content,
        @NotNull MessageType type
) {
}
