package com.project.backend.modules.notification.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.notification.dto.request.UpdateNotificationPreferenceRequest;
import com.project.backend.modules.notification.dto.response.NotificationPreferenceResponse;
import com.project.backend.modules.notification.dto.response.NotificationResponse;
import com.project.backend.modules.notification.dto.response.NotificationUnreadCountResponse;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import com.project.backend.modules.notification.service.NotificationService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class NotificationController {
    NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<Page<NotificationResponse>> getMyNotifications(
            @RequestParam(required = false) NotificationStatus status,
            @RequestParam(required = false) NotificationCategory category,
            @RequestParam(defaultValue = "false") boolean includeArchived,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ApiResponse.<Page<NotificationResponse>>builder()
                .result(notificationService.getMyNotifications(
                        status,
                        category,
                        includeArchived,
                        PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))
                ))
                .build();
    }

    @GetMapping("/unread-count")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<NotificationUnreadCountResponse> getUnreadCount() {
        return ApiResponse.<NotificationUnreadCountResponse>builder()
                .result(notificationService.getUnreadCount())
                .build();
    }

    @PatchMapping("/{notificationId}/read")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<NotificationResponse> markAsRead(@PathVariable String notificationId) {
        return ApiResponse.<NotificationResponse>builder()
                .result(notificationService.markAsRead(notificationId))
                .build();
    }

    @PatchMapping("/read-all")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<Void> markAllAsRead() {
        notificationService.markAllAsRead();
        return ApiResponse.<Void>builder().build();
    }

    @DeleteMapping("/{notificationId}")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<Void> archive(@PathVariable String notificationId) {
        notificationService.archive(notificationId);
        return ApiResponse.<Void>builder().build();
    }

    @GetMapping("/preferences")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<List<NotificationPreferenceResponse>> getPreferences() {
        return ApiResponse.<List<NotificationPreferenceResponse>>builder()
                .result(notificationService.getMyPreferences())
                .build();
    }

    @PutMapping("/preferences/{category}")
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public ApiResponse<NotificationPreferenceResponse> updatePreference(
            @PathVariable NotificationCategory category,
            @RequestBody @Valid UpdateNotificationPreferenceRequest request
    ) {
        return ApiResponse.<NotificationPreferenceResponse>builder()
                .result(notificationService.upsertPreference(category, request))
                .build();
    }
}
