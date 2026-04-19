package com.project.chat_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record CreateGroupRoomRequest(
        @NotBlank String name,
        @NotEmpty Set<String> participantIds
) {
}
