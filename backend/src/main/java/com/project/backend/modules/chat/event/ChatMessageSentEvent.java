package com.project.backend.modules.chat.event;

import com.project.backend.modules.chat.entity.ChatMessage;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.Set;

@Getter
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ChatMessageSentEvent {
    ChatMessage chatMessage;
    Set<String> recipientUsernames; // All members of the timeline
}
