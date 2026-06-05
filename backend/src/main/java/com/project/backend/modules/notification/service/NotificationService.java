package com.project.backend.modules.notification.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.notification.dto.request.UpdateNotificationPreferenceRequest;
import com.project.backend.modules.notification.dto.response.NotificationPreferenceResponse;
import com.project.backend.modules.notification.dto.response.NotificationResponse;
import com.project.backend.modules.notification.dto.response.NotificationUnreadCountResponse;
import com.project.backend.modules.notification.entity.Notification;
import com.project.backend.modules.notification.entity.NotificationPreference;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import com.project.backend.modules.notification.repository.NotificationPreferenceRepository;
import com.project.backend.modules.notification.repository.NotificationRepository;
import com.project.backend.modules.notification.service.command.CreateNotificationCommand;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationService {
    NotificationRepository notificationRepository;
    NotificationPreferenceRepository notificationPreferenceRepository;
    UserRepository userRepository;
    ObjectMapper objectMapper;
    NotificationRealtimeGateway notificationRealtimeGateway;

    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(
            NotificationStatus status,
            NotificationCategory category,
            boolean includeArchived,
            Pageable pageable
    ) {
        String username = getCurrentUsername();
        return notificationRepository.searchMyNotifications(username, status, category, includeArchived, pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public NotificationUnreadCountResponse getUnreadCount() {
        return NotificationUnreadCountResponse.builder()
                .unreadCount(notificationRepository.countByUserUsernameAndStatusAndArchivedAtIsNull(
                        getCurrentUsername(),
                        NotificationStatus.UNREAD
                ))
                .build();
    }

    @Transactional
    public NotificationResponse markAsRead(String notificationId) {
        Notification notification = getOwnedNotification(notificationId);
        if (notification.getStatus() == NotificationStatus.UNREAD) {
            notification.setStatus(NotificationStatus.READ);
            notification.setReadAt(LocalDateTime.now());
        }
        return toResponse(notificationRepository.save(notification));
    }

    @Transactional
    public void markAllAsRead() {
        User user = getCurrentUser();
        notificationRepository.markAllAsRead(user.getId(), LocalDateTime.now());
    }

    @Transactional
    public void archive(String notificationId) {
        Notification notification = getOwnedNotification(notificationId);
        notification.setStatus(NotificationStatus.ARCHIVED);
        notification.setArchivedAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional(readOnly = true)
    public List<NotificationPreferenceResponse> getMyPreferences() {
        User user = getCurrentUser();
        Map<NotificationCategory, NotificationPreference> preferenceMap = new LinkedHashMap<>();
        notificationPreferenceRepository.findAllByUserUsernameOrderByCategoryAsc(user.getUsername())
                .forEach(preference -> preferenceMap.put(preference.getCategory(), preference));

        return Arrays.stream(NotificationCategory.values())
                .map(category -> {
                    NotificationPreference preference = preferenceMap.get(category);
                    return NotificationPreferenceResponse.builder()
                            .category(category)
                            .inAppEnabled(preference == null || Boolean.TRUE.equals(preference.getInAppEnabled()))
                            .realtimeEnabled(preference == null || Boolean.TRUE.equals(preference.getRealtimeEnabled()))
                            .build();
                })
                .toList();
    }

    @Transactional
    public NotificationPreferenceResponse upsertPreference(
            NotificationCategory category,
            UpdateNotificationPreferenceRequest request
    ) {
        User user = getCurrentUser();
        NotificationPreference preference = notificationPreferenceRepository.findByUser_IdAndCategory(user.getId(), category)
                .orElse(NotificationPreference.builder()
                        .user(user)
                        .category(category)
                        .build());
        preference.setInAppEnabled(request.getInAppEnabled());
        preference.setRealtimeEnabled(request.getRealtimeEnabled());
        NotificationPreference savedPreference = notificationPreferenceRepository.save(preference);

        return NotificationPreferenceResponse.builder()
                .category(savedPreference.getCategory())
                .inAppEnabled(savedPreference.getInAppEnabled())
                .realtimeEnabled(savedPreference.getRealtimeEnabled())
                .build();
    }

    @Transactional
    public void createNotification(CreateNotificationCommand command) {
        User user = userRepository.findByUsername(command.getRecipientUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
        NotificationPreference preference = notificationPreferenceRepository.findByUser_IdAndCategory(user.getId(), command.getCategory())
                .orElse(null);

        boolean inAppEnabled = preference == null || Boolean.TRUE.equals(preference.getInAppEnabled());
        boolean realtimeEnabled = preference == null || Boolean.TRUE.equals(preference.getRealtimeEnabled());
        if (!inAppEnabled) {
            return;
        }

        Notification notification = notificationRepository.save(Notification.builder()
                .user(user)
                .category(command.getCategory())
                .type(command.getType())
                .title(command.getTitle())
                .message(command.getMessage())
                .payload(serializePayload(command.getPayload()))
                .status(NotificationStatus.UNREAD)
                .sourceModule(command.getSourceModule())
                .sourceReferenceType(command.getSourceReferenceType())
                .sourceReferenceId(command.getSourceReferenceId())
                .realtimeEligible(Boolean.TRUE.equals(command.getRealtimeEligible()))
                .build());

        NotificationResponse response = toResponse(notification);
        if (Boolean.TRUE.equals(command.getRealtimeEligible()) && realtimeEnabled) {
            notificationRealtimeGateway.publishToUser(user.getUsername(), response);
        }
    }

    private Notification getOwnedNotification(String notificationId) {
        String username = getCurrentUsername();
        Notification notification = notificationRepository.findByIdAndUserUsername(notificationId, username)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_EXIST));
        if (!notification.getUser().getUsername().equals(username)) {
            throw new AppException(ErrorCode.NOTIFICATION_ACCESS_DENIED);
        }
        return notification;
    }

    private User getCurrentUser() {
        return userRepository.findByUsername(getCurrentUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return authentication.getName();
    }

    private NotificationResponse toResponse(Notification notification) {
        return NotificationResponse.builder()
                .id(notification.getId())
                .category(notification.getCategory())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .payload(deserializePayload(notification.getPayload()))
                .status(notification.getStatus())
                .sourceModule(notification.getSourceModule())
                .sourceReferenceType(notification.getSourceReferenceType())
                .sourceReferenceId(notification.getSourceReferenceId())
                .realtimeEligible(notification.getRealtimeEligible())
                .createdAt(notification.getCreatedAt())
                .readAt(notification.getReadAt())
                .archivedAt(notification.getArchivedAt())
                .build();
    }

    private String serializePayload(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload == null ? Map.of() : payload);
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to serialize notification payload", exception);
        }
    }

    private Map<String, Object> deserializePayload(String payload) {
        try {
            return objectMapper.readValue(payload, new TypeReference<>() {
            });
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to deserialize notification payload", exception);
        }
    }
}
