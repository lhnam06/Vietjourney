package com.project.backend.modules.notification.service;

import com.project.backend.modules.notification.dto.response.NotificationResponse;
import org.springframework.stereotype.Component;

@Component
public class NoopNotificationRealtimeGateway implements NotificationRealtimeGateway {
    @Override
    public void publishToUser(String userId, NotificationResponse notification) {
        // Future WebSocket/STOMP gateway implementation plugs in here.
    }
}
