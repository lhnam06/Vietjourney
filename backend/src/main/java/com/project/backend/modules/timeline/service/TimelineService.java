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
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class TimelineService {
    TimelineRepository timelineRepository;
    TimelineMemberRepository timelineMemberRepository;
    TimelineEventRepository timelineEventRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    PlaceLookupService placeLookupService;

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
        return timelineRepository.findAllByOwnerUsernameOrderByCreatedAtDesc(currentUser.getUsername()).stream()
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
        member.setRole(request.getRole());

        return toMemberResponse(timelineMemberRepository.save(member));
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

    private TimelineResponse toResponse(Timeline timeline, List<TimelineMember> members, List<TimelineEvent> events) {
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
