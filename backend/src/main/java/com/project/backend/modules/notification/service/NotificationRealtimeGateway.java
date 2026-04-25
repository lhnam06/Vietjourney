package com.project.backend.modules.notification.service;

import com.project.backend.modules.notification.dto.response.NotificationResponse;

public interface NotificationRealtimeGateway {
    void publishToUser(String userId, NotificationResponse notification);
}
