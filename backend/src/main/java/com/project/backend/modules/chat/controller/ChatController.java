package com.project.backend.modules.chat.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.chat.dto.request.ChatMessageRequest;
import com.project.backend.modules.chat.dto.response.ChatMessageResponse;
import com.project.backend.modules.chat.service.ChatService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/timelines/{timelineId}/chat")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatController {
    ChatService chatService;

    @PostMapping
    public ApiResponse<ChatMessageResponse> sendMessage(@PathVariable String timelineId, @RequestBody ChatMessageRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String username = authentication.getName();
        return ApiResponse.<ChatMessageResponse>builder()
                .result(chatService.sendMessage(timelineId, request, username))
                .build();
    }

    @GetMapping
    public ApiResponse<List<ChatMessageResponse>> getChatHistory(
            @PathVariable String timelineId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ApiResponse.<List<ChatMessageResponse>>builder()
                .result(chatService.getChatHistory(timelineId, page, size))
                .build();
    }
}
