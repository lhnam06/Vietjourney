package com.project.backend.modules.notification.dto.response;

import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import com.project.backend.modules.notification.enums.NotificationType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationResponse {
    String id;
    NotificationCategory category;
    NotificationType type;
    String title;
    String message;
    Map<String, Object> payload;
    NotificationStatus status;
    String sourceModule;
    String sourceReferenceType;
    String sourceReferenceId;
    Boolean realtimeEligible;
    LocalDateTime createdAt;
    LocalDateTime readAt;
    LocalDateTime archivedAt;
}
