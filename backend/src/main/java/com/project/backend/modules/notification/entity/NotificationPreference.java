package com.project.backend.modules.notification.entity;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.notification.enums.NotificationCategory;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notification_preferences",
        uniqueConstraints = @UniqueConstraint(name = "uk_notification_preferences_user_category", columnNames = {"user_id", "category"})
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    NotificationCategory category;

    @Column(nullable = false)
    Boolean inAppEnabled;

    @Column(nullable = false)
    Boolean realtimeEnabled;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    LocalDateTime updatedAt;
}
