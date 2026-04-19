package com.project.chat_service.controller;

import com.project.chat_service.dto.ChatMessageRequest;
import com.project.chat_service.dto.ChatMessageResponse;
import com.project.chat_service.dto.ChatRoomResponse;
import com.project.chat_service.dto.CreateDirectRoomRequest;
import com.project.chat_service.dto.CreateGroupRoomRequest;
import com.project.chat_service.dto.JoinRoomRequest;
import com.project.chat_service.service.ChatRoomService;
import com.project.chat_service.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatRestController {

    private final ChatRoomService chatRoomService;
    private final MessageService messageService;

    @PostMapping("/rooms/direct")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatRoomResponse createDirectRoom(@Valid @RequestBody CreateDirectRoomRequest request) {
        return chatRoomService.createDirectRoom(request);
    }

    @PostMapping("/rooms/group")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatRoomResponse createGroupRoom(@Valid @RequestBody CreateGroupRoomRequest request) {
        return chatRoomService.createGroupRoom(request);
    }

    @GetMapping("/rooms")
    public List<ChatRoomResponse> getRooms() {
        return chatRoomService.getAllRooms();
    }

    @GetMapping("/rooms/{roomId}")
    public ChatRoomResponse getRoom(@PathVariable String roomId) {
        return chatRoomService.getRoom(roomId);
    }

    @GetMapping("/rooms/{roomId}/messages")
    public List<ChatMessageResponse> getMessages(@PathVariable String roomId) {
        return messageService.getRoomMessages(roomId);
    }

    @PostMapping("/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse sendMessage(@Valid @RequestBody ChatMessageRequest request) {
        return messageService.sendMessage(request);
    }

    @PostMapping("/rooms/join")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageResponse joinRoom(@Valid @RequestBody JoinRoomRequest request) {
        return messageService.joinRoom(request);
    }
}
