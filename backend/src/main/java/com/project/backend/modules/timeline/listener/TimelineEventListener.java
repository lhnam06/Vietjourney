package com.project.backend.modules.timeline.listener;

import com.project.backend.modules.timeline.event.TimelineChangedEvent;
import com.project.backend.modules.timeline.event.TimelineMemberInvitedEvent;
import com.project.backend.modules.timeline.messaging.TimelineEventPublisher;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineEventListener {
    TimelineEventPublisher timelineEventPublisher;

    @EventListener
    public void handleTimelineChanged(TimelineChangedEvent event) {
        log.info("Handling timeline changed event for real-time broadcast: {} - {}", event.getTimelineId(), event.getChangeType());
        
        // Broadcast to the timeline channel so everyone currently in the workspace gets an update
        timelineEventPublisher.publishEvent(
            event.getTimelineId(), 
            event.getChangeType().name(), 
            Map.of(
                "timelineId", event.getTimelineId(),
                "actor", event.getActorUsername(),
                "type", event.getChangeType()
            )
        );
    }

    @EventListener
    public void handleMemberInvited(TimelineMemberInvitedEvent event) {
        log.info("Handling member invited event for real-time broadcast: {} to {}", event.getTimelineId(), event.getInvitedUsername());
        
        // Also broadcast to the timeline channel so existing members see the new person
        timelineEventPublisher.publishEvent(
            event.getTimelineId(),
            "MEMBER_INVITED",
            Map.of(
                "timelineId", event.getTimelineId(),
                "invitedUsername", event.getInvitedUsername(),
                "role", event.getRole()
            )
        );
    }
}
