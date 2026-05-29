package com.project.backend.modules.notification.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.notification.dto.response.NotificationResponse;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@Primary
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RedisNotificationRealtimeGateway implements NotificationRealtimeGateway {
    StringRedisTemplate redisTemplate;
    ObjectMapper objectMapper;

    @Override
    public void publishToUser(String userId, NotificationResponse notification) {
        String channel = "user:" + userId;
        try {
            String payload = objectMapper.writeValueAsString(notification);
            redisTemplate.convertAndSend(channel, payload);
            log.debug("Published notification {} to channel {}", notification.getId(), channel);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize notification for realtime gateway: {}", notification.getId(), e);
        } catch (Exception e) {
            // Redis outages must not break REST flows (e.g. join-by-code creating notifications).
            log.error("Failed to publish notification {} to Redis channel {}: {}", notification.getId(), channel, e.getMessage());
        }
    }
}
