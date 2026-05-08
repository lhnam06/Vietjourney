package com.project.backend.modules.timeline.service;

import com.project.backend.common.constant.RoleConstant;
import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component("timelineSecurity")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineSecurityService {
    TimelineRepository timelineRepository;
    TimelineMemberRepository timelineMemberRepository;

    public boolean canViewTimeline(String timelineId) {
        String username = getCurrentUsername();
        if (username == null) {
            return false;
        }
        if (isAdmin()) {
            return true;
        }
        if (timelineRepository.existsByIdAndOwnerUsername(timelineId, username)) {
            return true;
        }
        return timelineMemberRepository.existsByTimelineIdAndUserUsernameAndRoleIn(
                timelineId,
                username,
                Set.of(TimelineMemberRole.OWNER, TimelineMemberRole.EDITOR, TimelineMemberRole.VIEWER)
        );
    }

    public boolean canEditTimeline(String timelineId) {
        String username = getCurrentUsername();
        if (username == null) {
            return false;
        }
        return timelineRepository.existsByIdAndOwnerUsername(timelineId, username)
                || timelineMemberRepository.existsByTimelineIdAndUserUsernameAndRoleIn(
                timelineId,
                username,
                Set.of(TimelineMemberRole.OWNER, TimelineMemberRole.EDITOR)
        );
    }

    public boolean isOwner(String timelineId) {
        String username = getCurrentUsername();
        return username != null && timelineRepository.existsByIdAndOwnerUsername(timelineId, username);
    }

    public void requireViewAccess(String timelineId) {
        if (!canViewTimeline(timelineId)) {
            throw new AppException(ErrorCode.TIMELINE_ACCESS_DENIED);
        }
    }

    public void requireEditAccess(String timelineId) {
        if (!canEditTimeline(timelineId)) {
            throw new AppException(ErrorCode.TIMELINE_ACCESS_DENIED);
        }
    }

    public void requireOwnerAccess(String timelineId) {
        if (!isOwner(timelineId)) {
            throw new AppException(ErrorCode.TIMELINE_ACCESS_DENIED);
        }
    }

    public String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return authentication.getName();
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + RoleConstant.ADMIN_ROLE));
    }
}
