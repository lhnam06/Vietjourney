package com.project.backend.modules.chat.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;
    private String timelineId;
    private String senderId; // Corresponds to User.id
    private String senderUsername; // For display purposes
    private String content;
    private LocalDateTime timestamp;
}
