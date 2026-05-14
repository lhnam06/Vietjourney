package com.project.backend.modules.timeline.messaging;

import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineEventPublisher {
    RedisTemplate<String, Object> redisTemplate;

    public void publishEvent(String timelineId, String type, Object data) {
        String channel = "timeline:" + timelineId;
        Map<String, Object> message = Map.of(
            "type", type,
            "data", data,
            "timestamp", System.currentTimeMillis()
        );
        
        log.info("Publishing event to {}: {}", channel, type);
        try {
            redisTemplate.convertAndSend(channel, message);
        } catch (Exception e) {
            log.error("Failed to publish event to Redis: {}", e.getMessage());
            // Don't rethrow - Redis failures shouldn't break the main flow
        }
    }
}
