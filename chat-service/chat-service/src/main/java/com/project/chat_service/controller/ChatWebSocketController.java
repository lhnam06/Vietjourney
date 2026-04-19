package com.project.chat_service.controller;

import com.project.chat_service.dto.ChatMessageRequest;
import com.project.chat_service.dto.JoinRoomRequest;
import com.project.chat_service.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;
import org.springframework.validation.annotation.Validated;
import org.springframework.messaging.handler.annotation.MessageMapping;

@Controller
@Validated
@RequiredArgsConstructor
public class ChatWebSocketController {

    private final MessageService messageService;

    @MessageMapping("/chat.send")
    public void sendMessage(@Valid @Payload ChatMessageRequest request) {
        messageService.sendMessage(request);
    }

    @MessageMapping("/chat.join")
    public void joinRoom(@Valid @Payload JoinRoomRequest request) {
        messageService.joinRoom(request);
    }
}
