package com.project.chat_service;

import com.project.chat_service.dto.ChatMessageRequest;
import com.project.chat_service.dto.ChatMessageResponse;
import com.project.chat_service.dto.ChatRoomResponse;
import com.project.chat_service.dto.CreateDirectRoomRequest;
import com.project.chat_service.dto.JoinRoomRequest;
import com.project.chat_service.entity.ChatRoom;
import com.project.chat_service.entity.ChatRoomType;
import com.project.chat_service.entity.Message;
import com.project.chat_service.entity.MessageType;
import com.project.chat_service.repository.ChatRoomRepository;
import com.project.chat_service.repository.MessageRepository;
import com.project.chat_service.service.ChatRoomService;
import com.project.chat_service.service.MessageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatServiceApplicationTests {

    @Mock
    private ChatRoomRepository chatRoomRepository;

    @Mock
    private MessageRepository messageRepository;

    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private ChatRoomService chatRoomService;

    @Test
    void shouldReuseExistingDirectRoom() {
        ChatRoom existingRoom = directRoom("room-1", "alice", "bob");
        when(chatRoomRepository.findAllByType(ChatRoomType.DIRECT)).thenReturn(List.of(existingRoom));

        ChatRoomResponse response = chatRoomService.createDirectRoom(new CreateDirectRoomRequest("bob", "alice"));

        assertEquals("room-1", response.id());
        verify(chatRoomRepository, never()).save(any(ChatRoom.class));
    }

    @Test
    void shouldPersistAndPublishChatMessage() {
        ChatRoomService roomService = new ChatRoomService(chatRoomRepository);
        MessageService messageService = new MessageService(roomService, messageRepository, rabbitTemplate);
        ChatRoom room = directRoom("room-1", "alice", "bob");

        when(chatRoomRepository.findById("room-1")).thenReturn(Optional.of(room));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("msg-1");
            message.setSentAt(Instant.parse("2026-04-19T08:00:00Z"));
            return message;
        });

        ChatMessageResponse response = messageService.sendMessage(
                new ChatMessageRequest("room-1", "alice", "hello bob", MessageType.CHAT)
        );

        assertEquals("msg-1", response.id());
        assertEquals("room-1", response.roomId());
        assertEquals("hello bob", response.content());

        ArgumentCaptor<String> exchangeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> routingCaptor = ArgumentCaptor.forClass(String.class);
        verify(rabbitTemplate).convertAndSend(exchangeCaptor.capture(), routingCaptor.capture(), any(Object.class));
        assertEquals("chat.exchange", exchangeCaptor.getValue());
        assertEquals("chat.room.room-1", routingCaptor.getValue());
    }

    @Test
    void shouldAddParticipantWhenJoiningRoom() {
        ChatRoomService roomService = new ChatRoomService(chatRoomRepository);
        MessageService messageService = new MessageService(roomService, messageRepository, rabbitTemplate);
        ChatRoom groupRoom = new ChatRoom();
        groupRoom.setId("group-1");
        groupRoom.setType(ChatRoomType.GROUP);
        groupRoom.setName("backend-team");
        groupRoom.setParticipantIds(new LinkedHashSet<>(Set.of("alice", "bob", "carol")));

        when(chatRoomRepository.findById("group-1")).thenReturn(Optional.of(groupRoom));
        when(chatRoomRepository.save(any(ChatRoom.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(messageRepository.save(any(Message.class))).thenAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId("join-1");
            message.setSentAt(Instant.parse("2026-04-19T08:05:00Z"));
            return message;
        });

        ChatMessageResponse response = messageService.joinRoom(new JoinRoomRequest("group-1", "dave"));

        assertEquals(MessageType.JOIN, response.type());
        assertTrue(groupRoom.getParticipantIds().contains("dave"));
        verify(chatRoomRepository).save(eq(groupRoom));
        verify(rabbitTemplate).convertAndSend(eq("chat.exchange"), eq("chat.room.group-1"), any(Object.class));
    }

    private ChatRoom directRoom(String roomId, String firstParticipant, String secondParticipant) {
        ChatRoom room = new ChatRoom();
        room.setId(roomId);
        room.setType(ChatRoomType.DIRECT);
        room.setName(firstParticipant + "__" + secondParticipant);
        room.setParticipantIds(new LinkedHashSet<>(Set.of(firstParticipant, secondParticipant)));
        return room;
    }
}
