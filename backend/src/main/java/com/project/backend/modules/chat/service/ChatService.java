package com.project.backend.modules.chat.service;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.chat.dto.request.ChatMessageRequest;
import com.project.backend.modules.chat.dto.response.ChatMessageResponse;
import com.project.backend.modules.chat.entity.ChatMessage;
import com.project.backend.modules.chat.event.ChatMessageSentEvent;
import com.project.backend.modules.chat.repository.ChatMessageRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatService {
    ChatMessageRepository chatMessageRepository;
    UserRepository userRepository;
    TimelineMemberRepository timelineMemberRepository;
    ApplicationEventPublisher eventPublisher;

    @PreAuthorize("hasRole('USER')")
    public ChatMessageResponse sendMessage(String timelineId, ChatMessageRequest request, String username) {
        User sender = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("Sender not found"));

        ChatMessage chatMessage = ChatMessage.builder()
                .timelineId(timelineId)
                .senderId(sender.getId())
                .senderUsername(sender.getUsername())
                .content(request.getContent())
                .timestamp(LocalDateTime.now())
                .build();

        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        // Get all members of the timeline to send the event to relevant users
        Set<String> recipientUsernames = timelineMemberRepository.findAllByTimelineIdOrderByCreatedAtAsc(timelineId).stream()
                .map(member -> member.getUser().getUsername())
                .collect(Collectors.toSet());

        eventPublisher.publishEvent(new ChatMessageSentEvent(savedMessage, recipientUsernames));

        return ChatMessageResponse.builder()
                .id(savedMessage.getId())
                .timelineId(savedMessage.getTimelineId())
                .senderId(savedMessage.getSenderId())
                .senderUsername(savedMessage.getSenderUsername())
                .content(savedMessage.getContent())
                .timestamp(savedMessage.getTimestamp())
                .build();
    }

    @PreAuthorize("hasRole('USER')")
    public List<ChatMessageResponse> getChatHistory(String timelineId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return chatMessageRepository.findByTimelineIdOrderByTimestampAsc(timelineId, pageable).stream()
                .map(message -> ChatMessageResponse.builder()
                        .id(message.getId())
                        .timelineId(message.getTimelineId())
                        .senderId(message.getSenderId())
                        .senderUsername(message.getSenderUsername())
                        .content(message.getContent())
                        .timestamp(message.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }
}
