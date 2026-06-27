package com.project.backend.modules.chat.listener;

import com.project.backend.modules.chat.event.ChatMessageSentEvent;
import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatEventListener {
    TimelineEventPublisher timelineEventPublisher;

    @EventListener
    public void handleChatMessageSent(ChatMessageSentEvent event) {
        log.info("Handling chat message sent event for timeline {}", event.getChatMessage().getTimelineId());

        timelineEventPublisher.publishEvent(
            event.getChatMessage().getTimelineId(),
            "CHAT_MESSAGE",
            Map.of(
                "id", event.getChatMessage().getId(),
                "timelineId", event.getChatMessage().getTimelineId(),
                "senderId", event.getChatMessage().getSenderId(),
                "senderUsername", event.getChatMessage().getSenderUsername(),
                "content", event.getChatMessage().getContent(),
                "timestamp", event.getChatMessage().getTimestamp()
            )
        );
    }
}
