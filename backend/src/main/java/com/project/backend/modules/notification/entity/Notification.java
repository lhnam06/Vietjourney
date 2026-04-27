package com.project.backend.modules.notification.entity;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import com.project.backend.modules.notification.enums.NotificationType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Notification {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    NotificationCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    NotificationType type;

    @Column(nullable = false)
    String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    String message;

    @Column(nullable = false, columnDefinition = "TEXT")
    String payload;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    NotificationStatus status;

    @Column(nullable = false)
    String sourceModule;

    String sourceReferenceType;

    String sourceReferenceId;

    @Column(nullable = false)
    Boolean realtimeEligible;

    LocalDateTime readAt;

    LocalDateTime archivedAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    LocalDateTime updatedAt;
}
