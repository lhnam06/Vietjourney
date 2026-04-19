package com.project.chat_service.dto;

import jakarta.validation.constraints.NotBlank;

public record JoinRoomRequest(
        @NotBlank String roomId,
        @NotBlank String userId
) {
}
