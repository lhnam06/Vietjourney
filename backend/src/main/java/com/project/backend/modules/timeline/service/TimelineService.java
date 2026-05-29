package com.project.backend.modules.timeline.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.dto.request.CreateTimelineRequest;
import com.project.backend.modules.timeline.dto.request.UpdateTimelineRequest;
import com.project.backend.modules.timeline.dto.request.UpsertTimelineMemberRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.timeline.dto.response.TimelineMemberResponse;
import com.project.backend.modules.timeline.dto.response.TimelinePlaceResponse;
import com.project.backend.modules.timeline.dto.response.TimelineResponse;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.entity.TimelineMember;
import com.project.backend.modules.timeline.event.TimelineChangeType;
import com.project.backend.modules.timeline.event.TimelineChangedEvent;
import com.project.backend.modules.timeline.event.TimelineMemberInvitedEvent;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.dto.request.JoinTimelineByCodeRequest;
import com.project.backend.modules.timeline.dto.request.ResetTimelineInviteCodeRequest;
import com.project.backend.modules.timeline.dto.response.JoinTimelineByCodeResponse;
import com.project.backend.modules.timeline.dto.response.ResetTimelineInviteCodeResponse;
import com.project.backend.modules.timeline.entity.TimelineInviteCode;
import com.project.backend.modules.timeline.repository.TimelineInviteCodeRepository;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineService {
    TimelineRepository timelineRepository;
    TimelineMemberRepository timelineMemberRepository;
    TimelineEventRepository timelineEventRepository;
    TimelineInviteCodeRepository timelineInviteCodeRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    PlaceLookupService placeLookupService;
    ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public TimelineResponse createTimeline(CreateTimelineRequest request) {
        validateTimelineDateRange(request.getStartDate(), request.getEndDate());

        User owner = getCurrentUser();
        Timeline timeline = Timeline.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .visibility(request.getVisibility())
                .owner(owner)
                .build();
        timeline = timelineRepository.save(timeline);

        TimelineMember ownerMember = TimelineMember.builder()
                .timeline(timeline)
                .user(owner)
                .role(TimelineMemberRole.OWNER)
                .build();
        timelineMemberRepository.save(ownerMember);

        return getTimeline(timeline.getId());
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public TimelineResponse getTimeline(String timelineId) {
        timelineSecurityService.requireViewAccess(timelineId);
        Timeline timeline = getTimelineOrThrow(timelineId);
        List<TimelineMember> members = timelineMemberRepository.findAllByTimelineIdOrderByCreatedAtAsc(timelineId);
        List<TimelineEvent> events = timelineEventRepository.findTimelineEventsInRange(
                timelineId,
                timeline.getStartDate().atStartOfDay(),
                timeline.getEndDate().plusDays(1).atStartOfDay()
        );
        return toResponse(timeline, members, events);
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public List<TimelineResponse> getMyTimelines() {
        User currentUser = getCurrentUser();
        
        // 1. Get timelines where user is owner
        List<Timeline> owned = timelineRepository.findAllByOwnerUsernameOrderByCreatedAtDesc(currentUser.getUsername());
        
        // 2. Get timelines where user is a member (but not necessarily owner)
        List<Timeline> joined = timelineMemberRepository.findAllByUserUsername(currentUser.getUsername()).stream()
                .map(TimelineMember::getTimeline)
                // Filter out those already in 'owned' if needed, though usually owner is also in timeline_members
                .filter(t -> !t.getOwner().getUsername().equals(currentUser.getUsername()))
                .toList();

        // Combine and sort by createdAt desc
        List<Timeline> all = new java.util.ArrayList<>(owned);
        all.addAll(joined);
        all.sort(Comparator.comparing(Timeline::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())));

        return all.stream()
                .map(timeline -> toResponse(
                        timeline,
                        timelineMemberRepository.findAllByTimelineIdOrderByCreatedAtAsc(timeline.getId()),
                        timelineEventRepository.findTimelineEventsInRange(
                                timeline.getId(),
                                timeline.getStartDate().atStartOfDay(),
                                timeline.getEndDate().plusDays(1).atStartOfDay()
                        )
                ))
                .toList();
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public TimelineResponse updateTimeline(String timelineId, UpdateTimelineRequest request) {
        timelineSecurityService.requireOwnerAccess(timelineId);
        validateTimelineDateRange(request.getStartDate(), request.getEndDate());

        Timeline timeline = timelineRepository.findByIdForUpdate(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
        ensureTimelineRangeCanContainExistingEvents(timelineId, request.getStartDate(), request.getEndDate());

        timeline.setTitle(request.getTitle());
        timeline.setDescription(request.getDescription());
        timeline.setStartDate(request.getStartDate());
        timeline.setEndDate(request.getEndDate());
        timeline.setVisibility(request.getVisibility());
        publishTimelineChangedEvent(timeline, TimelineChangeType.TIMELINE_UPDATED);

        return getTimeline(timeline.getId());
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public TimelineMemberResponse upsertMember(String timelineId, UpsertTimelineMemberRequest request) {
        timelineSecurityService.requireOwnerAccess(timelineId);
        Timeline timeline = getTimelineOrThrow(timelineId);
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));

        if (timeline.getOwner().getId().equals(user.getId())) {
            throw new AppException(ErrorCode.TIMELINE_MEMBER_ALREADY_EXISTS);
        }

        TimelineMember member = timelineMemberRepository.findByTimelineIdAndUserUsername(timelineId, request.getUsername())
                .orElse(TimelineMember.builder()
                        .timeline(timeline)
                        .user(user)
                        .build());
        boolean isNewMember = member.getId() == null;
        member.setRole(request.getRole());
        TimelineMember savedMember = timelineMemberRepository.save(member);
        if (isNewMember) {
            applicationEventPublisher.publishEvent(TimelineMemberInvitedEvent.builder()
                    .timelineId(timeline.getId())
                    .timelineTitle(timeline.getTitle())
                    .actorUsername(getCurrentUser().getUsername())
                    .invitedUsername(user.getUsername())
                    .role(savedMember.getRole())
                    .build());
        }

        return toMemberResponse(savedMember);
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public void removeMember(String timelineId, String memberId) {
        timelineSecurityService.requireOwnerAccess(timelineId);
        TimelineMember member = timelineMemberRepository.findById(memberId)
                .filter(item -> item.getTimeline().getId().equals(timelineId))
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_MEMBER_NOT_EXIST));
        timelineMemberRepository.delete(member);
    }

    @Transactional
    @PreAuthorize("@timelineSecurity.isOwner(#timelineId)")
    public ResetTimelineInviteCodeResponse resetTimelineInviteCode(String timelineId, ResetTimelineInviteCodeRequest request) {
        timelineSecurityService.requireOwnerAccess(timelineId);
        Timeline timeline = getTimelineOrThrow(timelineId);
        
        timelineInviteCodeRepository.deactivateActiveByTimelineId(timelineId);

        String rawCode = generateRandomCode(6);
        String codeHash = sha256(rawCode);

        TimelineInviteCode inviteCode = TimelineInviteCode.builder()
                .timeline(timeline)
                .codeHash(codeHash)
                .code(rawCode)
                .role(request.getRole())
                .maxUses(request.getMaxUses() != null ? request.getMaxUses() : 0)
                .usedCount(0)
                .active(true)
                .expiresAt(LocalDateTime.now().plusHours(request.getExpiresInHours() != null ? request.getExpiresInHours() : 72))
                .createdBy(getCurrentUser())
                .build();

        timelineInviteCodeRepository.save(inviteCode);

        return ResetTimelineInviteCodeResponse.builder()
                .code(rawCode)
                .role(inviteCode.getRole())
                .maxUses(inviteCode.getMaxUses())
                .expiresAt(inviteCode.getExpiresAt())
                .build();
    }

    @Transactional
    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public JoinTimelineByCodeResponse joinTimelineByCode(JoinTimelineByCodeRequest request) {
        String normalizedCode = request.getCode().trim().toUpperCase(java.util.Locale.ROOT);
        String codeHash = sha256(normalizedCode);
        TimelineInviteCode inviteCode = timelineInviteCodeRepository.findActiveByCodeHashForUpdate(codeHash)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_INVITE_CODE_INVALID));

        if (inviteCode.getExpiresAt().isBefore(LocalDateTime.now())) {
            inviteCode.setActive(false);
            timelineInviteCodeRepository.save(inviteCode);
            throw new AppException(ErrorCode.TIMELINE_INVITE_CODE_INVALID);
        }

        if (inviteCode.getMaxUses() > 0 && inviteCode.getUsedCount() >= inviteCode.getMaxUses()) {
            inviteCode.setActive(false);
            timelineInviteCodeRepository.save(inviteCode);
            throw new AppException(ErrorCode.TIMELINE_INVITE_CODE_INVALID);
        }

        User user = getCurrentUser();
        Timeline timeline = inviteCode.getTimeline();

        if (timeline.getOwner().getId().equals(user.getId())) {
            return JoinTimelineByCodeResponse.builder()
                    .timelineId(timeline.getId())
                    .role(com.project.backend.modules.timeline.enums.TimelineMemberRole.OWNER)
                    .build();
        }

        boolean isNewMember = false;
        TimelineMember member = timelineMemberRepository.findByTimelineIdAndUserUsername(timeline.getId(), user.getUsername())
                .orElse(null);

        if (member == null) {
            member = TimelineMember.builder()
                    .timeline(timeline)
                    .user(user)
                    .role(inviteCode.getRole())
                    .build();
            isNewMember = true;
            inviteCode.setUsedCount(inviteCode.getUsedCount() + 1);
            if (inviteCode.getMaxUses() > 0 && inviteCode.getUsedCount() >= inviteCode.getMaxUses()) {
                inviteCode.setActive(false);
            }
            timelineInviteCodeRepository.save(inviteCode);
            timelineMemberRepository.save(member);
        }

        if (isNewMember) {
            applicationEventPublisher.publishEvent(TimelineMemberInvitedEvent.builder()
                    .timelineId(timeline.getId())
                    .timelineTitle(timeline.getTitle())
                    .actorUsername(user.getUsername())
                    .invitedUsername(user.getUsername())
                    .role(member.getRole())
                    .build());
            publishTimelineChangedEvent(timeline, TimelineChangeType.TIMELINE_UPDATED);
        }

        return JoinTimelineByCodeResponse.builder()
                .timelineId(timeline.getId())
                .role(member.getRole())
                .build();
    }

    private String generateRandomCode(int length) {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        SecureRandom rnd = new SecureRandom();
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++)
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        return sb.toString();
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    @Transactional(readOnly = true)
    @PreAuthorize("@timelineSecurity.canViewTimeline(#timelineId)")
    public List<TimelineEventResponse> getTimelineEvents(String timelineId, LocalDateTime rangeStart, LocalDateTime rangeEnd) {
        timelineSecurityService.requireViewAccess(timelineId);
        if (rangeStart == null || rangeEnd == null || !rangeStart.isBefore(rangeEnd)) {
            throw new AppException(ErrorCode.INVALID_TIMELINE_EVENT_RANGE);
        }
        return sortEventsForDisplay(timelineEventRepository.findTimelineEventsInRange(timelineId, rangeStart, rangeEnd)).stream()
                .map(this::toEventResponse)
                .toList();
    }

    private User getCurrentUser() {
        String username = timelineSecurityService.getCurrentUsername();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
    }

    private Timeline getTimelineOrThrow(String timelineId) {
        return timelineRepository.findById(timelineId)
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));
    }

    private void validateTimelineDateRange(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            throw new AppException(ErrorCode.INVALID_TIMELINE_DATE_RANGE);
        }
    }

    private void ensureTimelineRangeCanContainExistingEvents(String timelineId, LocalDate startDate, LocalDate endDate) {
        LocalDateTime requestedStart = startDate.atStartOfDay();
        LocalDateTime requestedEndExclusive = endDate.plusDays(1).atStartOfDay();
        boolean hasOutsideEvent = timelineEventRepository.findTimelineEventsInRange(
                timelineId,
                LocalDateTime.of(1970, 1, 1, 0, 0),
                LocalDateTime.of(2999, 1, 1, 0, 0)
        ).stream().anyMatch(event ->
                event.getStartTime().isBefore(requestedStart) || !event.getEndTime().isBefore(requestedEndExclusive));

        if (hasOutsideEvent) {
            throw new AppException(ErrorCode.TIMELINE_EVENT_OUTSIDE_TIMELINE_RANGE);
        }
    }

    void publishTimelineChangedEvent(Timeline timeline, TimelineChangeType changeType) {
        String actorUsername = timelineSecurityService.getCurrentUsername();
        Set<String> recipientUsernames = timelineMemberRepository.findAllByTimelineIdOrderByCreatedAtAsc(timeline.getId()).stream()
                .map(member -> member.getUser().getUsername())
                .filter(username -> !username.equals(actorUsername))
                .collect(java.util.stream.Collectors.toSet());

        if (recipientUsernames.isEmpty()) {
            return;
        }

        applicationEventPublisher.publishEvent(TimelineChangedEvent.builder()
                .timelineId(timeline.getId())
                .timelineTitle(timeline.getTitle())
                .actorUsername(actorUsername)
                .changeType(changeType)
                .recipientUsernames(recipientUsernames)
                .build());
    }

    private TimelineResponse toResponse(Timeline timeline, List<TimelineMember> members, List<TimelineEvent> events) {
        String activeInviteCode = null;
        User currentUser = getCurrentUser();
        if (timeline.getOwner().getId().equals(currentUser.getId())) {
            activeInviteCode = timelineInviteCodeRepository.findByTimelineIdAndActiveTrue(timeline.getId())
                    .map(TimelineInviteCode::getCode)
                    .orElse(null);
        }

        return TimelineResponse.builder()
                .id(timeline.getId())
                .title(timeline.getTitle())
                .description(timeline.getDescription())
                .startDate(timeline.getStartDate())
                .endDate(timeline.getEndDate())
                .visibility(timeline.getVisibility())
                .ownerId(timeline.getOwner().getId())
                .ownerUsername(timeline.getOwner().getUsername())
                .ownerDisplayName(timeline.getOwner().getDisplayName())
                .members(members.stream().map(this::toMemberResponse).toList())
                .events(sortEventsForDisplay(events).stream().map(this::toEventResponse).toList())
                .activeInviteCode(activeInviteCode)
                .build();
    }

    private List<TimelineEvent> sortEventsForDisplay(List<TimelineEvent> events) {
        return events.stream()
                .sorted(Comparator
                        .comparing((TimelineEvent event) -> event.getStartTime().toLocalDate())
                        .thenComparing(TimelineEvent::getOrderIndex, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(TimelineEvent::getStartTime)
                        .thenComparing(TimelineEvent::getId))
                .toList();
    }

    TimelineEventResponse toEventResponse(TimelineEvent event) {
        return TimelineEventResponse.builder()
                .id(event.getId())
                .externalPlaceId(event.getExternalPlaceId())
                .place(placeLookupService.findPlace(event.getCategory(), event.getExternalPlaceId())
                        .map(place -> TimelinePlaceResponse.builder()
                                .id(place.getId())
                                .name(place.getName())
                                .address(place.getAddress())
                                .rating(place.getRating())
                                .latitude(place.getLatitude())
                                .longitude(place.getLongitude())
                                .district(place.getDistrict())
                                .imageUrl(place.getImageUrl())
                                .build())
                        .orElse(null))
                .category(event.getCategory())
                .startTime(event.getStartTime())
                .endTime(event.getEndTime())
                .orderIndex(event.getOrderIndex())
                .notes(event.getNotes())
                .status(event.getStatus())
                .version(event.getVersion())
                .build();
    }

    TimelineMemberResponse toMemberResponse(TimelineMember member) {
        return TimelineMemberResponse.builder()
                .id(member.getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .displayName(member.getUser().getDisplayName())
                .role(member.getRole())
                .build();
    }
}
