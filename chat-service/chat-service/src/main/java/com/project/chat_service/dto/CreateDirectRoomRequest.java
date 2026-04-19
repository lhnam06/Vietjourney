package com.project.chat_service.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateDirectRoomRequest(
        @NotBlank String firstParticipantId,
        @NotBlank String secondParticipantId
) {
}
