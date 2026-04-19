package com.project.chat_service.messaging;

import com.project.chat_service.config.RabbitMQConfig;
import com.project.chat_service.entity.ChatRoomType;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatEventListener {

    private final SimpMessagingTemplate messagingTemplate;

    @RabbitListener(queues = RabbitMQConfig.CHAT_EVENTS_QUEUE)
    public void onChatEvent(ChatEvent chatEvent) {
        messagingTemplate.convertAndSend("/topic/chat.room." + chatEvent.roomId(), chatEvent);
        if (chatEvent.roomType() == null || chatEvent.participantIds() == null) {
            return;
        }
        if (chatEvent.roomType() == ChatRoomType.DIRECT) {
            for (String participantId : chatEvent.participantIds()) {
                messagingTemplate.convertAndSendToUser(participantId, "/queue/direct", chatEvent);
            }
        }
    }
}
