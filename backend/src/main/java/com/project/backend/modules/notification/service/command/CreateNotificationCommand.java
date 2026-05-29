package com.project.backend.modules.notification.service.command;

import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationType;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@Getter
@Builder
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CreateNotificationCommand {
    String recipientUsername;
    NotificationCategory category;
    NotificationType type;
    String title;
    String message;
    Map<String, Object> payload;
    String sourceModule;
    String sourceReferenceType;
    String sourceReferenceId;
    Boolean realtimeEligible;
}
