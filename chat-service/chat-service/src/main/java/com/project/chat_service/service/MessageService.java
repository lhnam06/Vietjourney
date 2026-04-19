package com.project.chat_service.service;

import com.project.chat_service.config.RabbitMQConfig;
import com.project.chat_service.dto.ChatMessageRequest;
import com.project.chat_service.dto.ChatMessageResponse;
import com.project.chat_service.dto.JoinRoomRequest;
import com.project.chat_service.entity.ChatRoom;
import com.project.chat_service.entity.Message;
import com.project.chat_service.entity.MessageType;
import com.project.chat_service.exception.BadRequestException;
import com.project.chat_service.messaging.ChatEvent;
import com.project.chat_service.repository.MessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final ChatRoomService chatRoomService;
    private final MessageRepository messageRepository;
    private final RabbitTemplate rabbitTemplate;

    @Transactional
    public ChatMessageResponse sendMessage(ChatMessageRequest request) {
        if (request.type() != MessageType.CHAT) {
            throw new BadRequestException("Use type CHAT when sending a user message");
        }
        if (request.content().trim().isBlank()) {
            throw new BadRequestException("Message content must not be blank");
        }

        ChatRoom chatRoom = chatRoomService.getRoomEntity(request.roomId());
        validateSender(chatRoom, request.senderId());

        Message message = new Message();
        message.setChatRoom(chatRoom);
        message.setSenderId(request.senderId().trim());
        message.setContent(request.content().trim());
        message.setType(request.type());
        Message savedMessage = messageRepository.save(message);

        publish(savedMessage);
        return ChatMessageResponse.from(savedMessage);
    }

    @Transactional
    public ChatMessageResponse joinRoom(JoinRoomRequest request) {
        ChatRoom chatRoom = chatRoomService.ensureParticipant(request.roomId(), request.userId().trim());

        Message message = new Message();
        message.setChatRoom(chatRoom);
        message.setSenderId(request.userId().trim());
        message.setContent(request.userId().trim() + " joined the room");
        message.setType(MessageType.JOIN);
        Message savedMessage = messageRepository.save(message);

        publish(savedMessage);
        return ChatMessageResponse.from(savedMessage);
    }

    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getRoomMessages(String roomId) {
        chatRoomService.getRoomEntity(roomId);
        return messageRepository.findByChatRoomIdOrderBySentAtAsc(roomId).stream()
                .map(ChatMessageResponse::from)
                .toList();
    }

    private void validateSender(ChatRoom chatRoom, String senderId) {
        if (!chatRoom.getParticipantIds().contains(senderId.trim())) {
            throw new BadRequestException("Sender is not a participant of room " + chatRoom.getId());
        }
    }

    private void publish(Message message) {
        rabbitTemplate.convertAndSend(
                RabbitMQConfig.CHAT_EXCHANGE,
                "chat.room." + message.getChatRoom().getId(),
                new ChatEvent(
                        message.getId(),
                        message.getChatRoom().getId(),
                        message.getChatRoom().getType(),
                        message.getChatRoom().getParticipantIds(),
                        message.getSenderId(),
                        message.getContent(),
                        message.getType(),
                        message.getSentAt()
                )
        );
    }
}
