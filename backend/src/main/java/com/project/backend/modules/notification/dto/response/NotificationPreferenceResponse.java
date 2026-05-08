package com.project.backend.modules.notification.dto.response;

import com.project.backend.modules.notification.enums.NotificationCategory;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotificationPreferenceResponse {
    NotificationCategory category;
    Boolean inAppEnabled;
    Boolean realtimeEnabled;
}
