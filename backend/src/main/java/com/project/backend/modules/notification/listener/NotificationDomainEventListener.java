package com.project.backend.modules.notification.listener;

import com.project.backend.modules.auth.event.UserRegisteredEvent;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationType;
import com.project.backend.modules.notification.service.NotificationService;
import com.project.backend.modules.notification.service.command.CreateNotificationCommand;
import com.project.backend.modules.timeline.event.TimelineChangeType;
import com.project.backend.modules.timeline.event.TimelineChangedEvent;
import com.project.backend.modules.timeline.event.TimelineMemberInvitedEvent;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationDomainEventListener {
    NotificationService notificationService;

    @EventListener
    public void handleUserRegistered(UserRegisteredEvent event) {
        notificationService.createNotification(CreateNotificationCommand.builder()
                .recipientUsername(event.getUsername())
                .category(NotificationCategory.SYSTEM)
                .type(NotificationType.WELCOME)
                .title("Chào mừng đến với VietJourney")
                .message("Tài khoản của bạn đã sẵn sàng. Hãy bắt đầu lên lịch trình đầu tiên của bạn.")
                .payload(Map.of(
                        "userId", event.getUserId(),
                        "username", event.getUsername()
                ))
                .sourceModule("auth")
                .sourceReferenceType("user")
                .sourceReferenceId(event.getUserId())
                .realtimeEligible(false)
                .build());
    }

    @EventListener
    public void handleTimelineInvite(TimelineMemberInvitedEvent event) {
        notificationService.createNotification(CreateNotificationCommand.builder()
                .recipientUsername(event.getInvitedUsername())
                .category(NotificationCategory.COLLABORATION)
                .type(NotificationType.COLLABORATION_INVITE)
                .title("Bạn được mời tham gia một lịch trình chung")
                .message(event.getActorUsername() + " đã mời bạn cùng tham gia lịch trình " + event.getTimelineTitle() + ".")
                .payload(Map.of(
                        "timelineId", event.getTimelineId(),
                        "timelineTitle", event.getTimelineTitle(),
                        "role", event.getRole().name()
                ))
                .sourceModule("timeline")
                .sourceReferenceType("timeline")
                .sourceReferenceId(event.getTimelineId())
                .realtimeEligible(true)
                .build());
    }

    @EventListener
    public void handleTimelineChanged(TimelineChangedEvent event) {
        NotificationType type = mapType(event.getChangeType());
        String title = mapTitle(event.getChangeType());
        String message = mapMessage(event.getChangeType(), event.getActorUsername(), event.getTimelineTitle());

        for (String recipientUsername : event.getRecipientUsernames()) {
            Map<String, Object> payload = new HashMap<>();
            payload.put("timelineId", event.getTimelineId());
            payload.put("timelineTitle", event.getTimelineTitle());
            payload.put("changeType", event.getChangeType().name());
            payload.put("actorUsername", event.getActorUsername());

            notificationService.createNotification(CreateNotificationCommand.builder()
                    .recipientUsername(recipientUsername)
                    .category(NotificationCategory.TIMELINE)
                    .type(type)
                    .title(title)
                    .message(message)
                    .payload(payload)
                    .sourceModule("timeline")
                    .sourceReferenceType("timeline")
                    .sourceReferenceId(event.getTimelineId())
                    .realtimeEligible(true)
                    .build());
        }
    }

    private NotificationType mapType(TimelineChangeType changeType) {
        return switch (changeType) {
            case TIMELINE_UPDATED -> NotificationType.TIMELINE_UPDATED;
            case EVENT_ADDED -> NotificationType.COLLABORATOR_ADDED_EVENT;
            case EVENT_DELETED -> NotificationType.COLLABORATOR_REMOVED_EVENT;
            case EVENT_MOVED, EVENT_RESIZED, EVENT_REORDERED -> NotificationType.COLLABORATOR_EDITED_ITINERARY;
        };
    }

    private String mapTitle(TimelineChangeType changeType) {
        return switch (changeType) {
            case TIMELINE_UPDATED -> "Lịch trình đã được cập nhật";
            case EVENT_ADDED -> "Một hoạt động mới đã được thêm";
            case EVENT_DELETED -> "Một hoạt động đã bị xóa";
            case EVENT_MOVED, EVENT_RESIZED, EVENT_REORDERED -> "Lịch trình đã được thay đổi";
        };
    }

    private String mapMessage(TimelineChangeType changeType, String actorUsername, String timelineTitle) {
        return switch (changeType) {
            case TIMELINE_UPDATED -> actorUsername + " đã cập nhật lịch trình " + timelineTitle + ".";
            case EVENT_ADDED -> actorUsername + " đã thêm một hoạt động mới vào " + timelineTitle + ".";
            case EVENT_DELETED -> actorUsername + " đã xóa một hoạt động khỏi " + timelineTitle + ".";
            case EVENT_MOVED, EVENT_RESIZED, EVENT_REORDERED ->
                    actorUsername + " đã thay đổi các hoạt động trong " + timelineTitle + ".";
        };
    }
}
