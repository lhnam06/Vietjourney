package com.project.backend.modules.community.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.entity.Role;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.community.dto.request.CreateCommunityCommentRequest;
import com.project.backend.modules.community.dto.request.CreateCommunityPostRequest;
import com.project.backend.modules.community.dto.request.RateCommunityPostRequest;
import com.project.backend.modules.community.dto.response.*;
import com.project.backend.modules.community.entity.*;
import com.project.backend.modules.community.enums.CommunityInteractionType;
import com.project.backend.modules.community.enums.CommunityPostStatus;
import com.project.backend.modules.community.repository.*;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.dto.response.TimelineResponse;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.entity.TimelineMember;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.enums.TimelineVisibility;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import com.project.backend.modules.timeline.service.TimelineSecurityService;
import com.project.backend.modules.timeline.service.TimelineService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class CommunityService {
    CommunityPostRepository communityPostRepository;
    CommunityPostTagRepository communityPostTagRepository;
    CommunityPostInteractionRepository communityPostInteractionRepository;
    CommunityPostRatingRepository communityPostRatingRepository;
    CommunityCommentRepository communityCommentRepository;
    CommunityFollowRepository communityFollowRepository;
    TimelineRepository timelineRepository;
    TimelineEventRepository timelineEventRepository;
    TimelineMemberRepository timelineMemberRepository;
    UserRepository userRepository;
    TimelineSecurityService timelineSecurityService;
    TimelineService timelineService;
    PlaceLookupService placeLookupService;

    @Transactional(readOnly = true)
    public Page<CommunityPostResponse> getFeed(String tab, String query, String tag, Pageable pageable) {
        User currentUser = getCurrentUser();
        String normalizedQuery = normalizeNullable(query);
        String normalizedTag = normalizeNullableTag(tag);
        Page<CommunityPost> posts;

        if ("FOLLOWING".equalsIgnoreCase(tab)) {
            List<String> authorIds = communityFollowRepository.findAllByFollowerId(currentUser.getId()).stream()
                    .map(follow -> follow.getFollowing().getId())
                    .toList();
            if (authorIds.isEmpty()) {
                return Page.empty(pageable);
            }
            posts = communityPostRepository.searchPublishedByAuthors(
                    CommunityPostStatus.PUBLISHED,
                    authorIds,
                    normalizedQuery,
                    normalizedTag,
                    pageable
            );
        } else {
            posts = communityPostRepository.searchPublished(
                    CommunityPostStatus.PUBLISHED,
                    normalizedQuery,
                    normalizedTag,
                    pageable
            );
        }

        return posts.map(post -> toPostResponse(post, currentUser));
    }

    @Transactional(readOnly = true)
    public CommunitySummaryResponse getSummary() {
        User currentUser = getCurrentUser();
        List<CommunityTagResponse> tags = communityPostTagRepository.findAll().stream()
                .collect(Collectors.groupingBy(tag -> tag.getTag().toLowerCase(Locale.ROOT), Collectors.counting()))
                .entrySet()
                .stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(entry -> CommunityTagResponse.builder()
                        .tag(entry.getKey())
                        .count(entry.getValue())
                        .build())
                .toList();

        List<CommunityPost> hotPosts = communityPostRepository
                .findTop10ByStatusOrderByCopyCountDescCreatedAtDesc(CommunityPostStatus.PUBLISHED);
        List<CommunityAuthorResponse> creators = hotPosts.stream()
                .map(CommunityPost::getAuthor)
                .collect(Collectors.toMap(User::getId, user -> user, (first, second) -> first, LinkedHashMap::new))
                .values()
                .stream()
                .limit(5)
                .map(author -> toAuthorResponse(author, currentUser))
                .toList();

        return CommunitySummaryResponse.builder()
                .trendingTags(tags)
                .featuredCreators(creators)
                .hotTimelines(hotPosts.stream().limit(5).map(post -> toPostResponse(post, currentUser)).toList())
                .build();
    }

    @Transactional
    public CommunityPostResponse createPost(CreateCommunityPostRequest request) {
        User currentUser = getCurrentUser();
        timelineSecurityService.requireEditAccess(request.getTimelineId());
        Timeline timeline = timelineRepository.findById(request.getTimelineId())
                .orElseThrow(() -> new AppException(ErrorCode.TIMELINE_NOT_EXIST));

        CommunityPost post = communityPostRepository.save(CommunityPost.builder()
                .timeline(timeline)
                .author(currentUser)
                .caption(request.getCaption())
                .status(CommunityPostStatus.PUBLISHED)
                .copyCount(0)
                .publishedAt(LocalDateTime.now())
                .build());

        normalizeTags(request.getTags()).forEach(tag ->
                communityPostTagRepository.save(CommunityPostTag.builder()
                        .post(post)
                        .tag(tag)
                        .build())
        );

        return toPostResponse(post, currentUser);
    }

    @Transactional
    public CommunityPostResponse toggleInteraction(String postId, CommunityInteractionType type) {
        User currentUser = getCurrentUser();
        CommunityPost post = getPublishedPost(postId);
        communityPostInteractionRepository.findByPostIdAndUserIdAndType(postId, currentUser.getId(), type)
                .ifPresentOrElse(
                        communityPostInteractionRepository::delete,
                        () -> communityPostInteractionRepository.save(CommunityPostInteraction.builder()
                                .post(post)
                                .user(currentUser)
                                .type(type)
                                .build())
                );

        return toPostResponse(post, currentUser);
    }

    @Transactional
    public CommunityPostResponse ratePost(String postId, RateCommunityPostRequest request) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            throw new AppException(ErrorCode.COMMUNITY_INVALID_RATING);
        }

        User currentUser = getCurrentUser();
        CommunityPost post = getPublishedPost(postId);
        CommunityPostRating rating = communityPostRatingRepository
                .findByPostIdAndUserId(postId, currentUser.getId())
                .orElse(CommunityPostRating.builder()
                        .post(post)
                        .user(currentUser)
                        .build());
        rating.setRating(request.getRating());
        communityPostRatingRepository.save(rating);

        return toPostResponse(post, currentUser);
    }

    @Transactional(readOnly = true)
    public List<CommunityCommentResponse> getComments(String postId) {
        getPublishedPost(postId);
        User currentUser = getCurrentUser();
        return communityCommentRepository.findAllByPostIdOrderByCreatedAtAsc(postId).stream()
                .map(comment -> toCommentResponse(comment, currentUser))
                .toList();
    }

    @Transactional
    public CommunityCommentResponse createComment(String postId, CreateCommunityCommentRequest request) {
        User currentUser = getCurrentUser();
        CommunityPost post = getPublishedPost(postId);
        CommunityComment comment = communityCommentRepository.save(CommunityComment.builder()
                .post(post)
                .author(currentUser)
                .content(request.getContent().trim())
                .build());
        return toCommentResponse(comment, currentUser);
    }

    @Transactional
    public CommunityAuthorResponse toggleFollow(String authorId) {
        User currentUser = getCurrentUser();
        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
        if (currentUser.getId().equals(authorId)) {
            throw new AppException(ErrorCode.COMMUNITY_FOLLOW_SELF);
        }

        communityFollowRepository.findByFollowerIdAndFollowingId(currentUser.getId(), authorId)
                .ifPresentOrElse(
                        communityFollowRepository::delete,
                        () -> communityFollowRepository.save(CommunityFollow.builder()
                                .follower(currentUser)
                                .following(author)
                                .build())
                );

        return toAuthorResponse(author, currentUser);
    }

    @Transactional
    public TimelineResponse copyTimeline(String postId) {
        User currentUser = getCurrentUser();
        CommunityPost post = getPublishedPost(postId);
        Timeline sourceTimeline = post.getTimeline();
        Timeline copiedTimeline = timelineRepository.save(Timeline.builder()
                .title(sourceTimeline.getTitle() + " (từ cộng đồng)")
                .description(sourceTimeline.getDescription())
                .startDate(sourceTimeline.getStartDate())
                .endDate(sourceTimeline.getEndDate())
                .visibility(TimelineVisibility.PRIVATE)
                .owner(currentUser)
                .build());

        timelineMemberRepository.save(TimelineMember.builder()
                .timeline(copiedTimeline)
                .user(currentUser)
                .role(TimelineMemberRole.OWNER)
                .build());

        List<TimelineEvent> sourceEvents = timelineEventRepository.findTimelineEventsInRange(
                sourceTimeline.getId(),
                sourceTimeline.getStartDate().atStartOfDay(),
                sourceTimeline.getEndDate().plusDays(1).atStartOfDay()
        );
        for (TimelineEvent sourceEvent : sourceEvents) {
            timelineEventRepository.save(TimelineEvent.builder()
                    .timeline(copiedTimeline)
                    .externalPlaceId(sourceEvent.getExternalPlaceId())
                    .category(sourceEvent.getCategory())
                    .startTime(sourceEvent.getStartTime())
                    .endTime(sourceEvent.getEndTime())
                    .orderIndex(sourceEvent.getOrderIndex())
                    .notes(sourceEvent.getNotes())
                    .status(sourceEvent.getStatus())
                    .build());
        }

        post.setCopyCount((post.getCopyCount() == null ? 0 : post.getCopyCount()) + 1);
        communityPostRepository.save(post);

        return timelineService.getTimeline(copiedTimeline.getId());
    }

    private CommunityPost getPublishedPost(String postId) {
        return communityPostRepository.findById(postId)
                .filter(post -> post.getStatus() == CommunityPostStatus.PUBLISHED)
                .orElseThrow(() -> new AppException(ErrorCode.COMMUNITY_POST_NOT_EXIST));
    }

    private CommunityPostResponse toPostResponse(CommunityPost post, User currentUser) {
        Timeline timeline = post.getTimeline();
        List<TimelineEvent> events = timelineEventRepository.findTimelineEventsInRange(
                timeline.getId(),
                timeline.getStartDate().atStartOfDay(),
                timeline.getEndDate().plusDays(1).atStartOfDay()
        );
        List<String> tags = communityPostTagRepository.findAllByPostId(post.getId()).stream()
                .map(CommunityPostTag::getTag)
                .toList();

        return CommunityPostResponse.builder()
                .id(post.getId())
                .timelineId(timeline.getId())
                .title(timeline.getTitle())
                .caption(post.getCaption())
                .startDate(timeline.getStartDate())
                .endDate(timeline.getEndDate())
                .author(toAuthorResponse(post.getAuthor(), currentUser))
                .tags(tags)
                .images(imagesFor(events))
                .itinerary(itineraryFor(timeline, events))
                .likeCount(communityPostInteractionRepository.countByPostIdAndType(post.getId(), CommunityInteractionType.LIKE))
                .commentCount(communityCommentRepository.countByPostId(post.getId()))
                .saveCount(communityPostInteractionRepository.countByPostIdAndType(post.getId(), CommunityInteractionType.SAVE))
                .copyCount(post.getCopyCount() == null ? 0 : post.getCopyCount())
                .ratingAverage(roundOne(communityPostRatingRepository.averageRating(post.getId())))
                .ratingCount(communityPostRatingRepository.countByPostId(post.getId()))
                .likedByMe(communityPostInteractionRepository.existsByPostIdAndUserIdAndType(
                        post.getId(),
                        currentUser.getId(),
                        CommunityInteractionType.LIKE
                ))
                .savedByMe(communityPostInteractionRepository.existsByPostIdAndUserIdAndType(
                        post.getId(),
                        currentUser.getId(),
                        CommunityInteractionType.SAVE
                ))
                .createdAt(post.getCreatedAt())
                .build();
    }

    private CommunityCommentResponse toCommentResponse(CommunityComment comment, User currentUser) {
        return CommunityCommentResponse.builder()
                .id(comment.getId())
                .author(toAuthorResponse(comment.getAuthor(), currentUser))
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }

    private CommunityAuthorResponse toAuthorResponse(User author, User currentUser) {
        return CommunityAuthorResponse.builder()
                .id(author.getId())
                .username(author.getUsername())
                .displayName(author.getDisplayName())
                .verified(isVerified(author))
                .followedByMe(!author.getId().equals(currentUser.getId())
                        && communityFollowRepository.existsByFollowerIdAndFollowingId(currentUser.getId(), author.getId()))
                .followerCount(communityFollowRepository.countByFollowingId(author.getId()))
                .postCount(communityPostRepository.countByAuthorIdAndStatus(author.getId(), CommunityPostStatus.PUBLISHED))
                .build();
    }

    private boolean isVerified(User user) {
        return user.getRoles() != null && user.getRoles().stream()
                .map(Role::getName)
                .anyMatch(role -> "ADMIN".equals(role) || "LEADER".equals(role));
    }

    private List<String> imagesFor(List<TimelineEvent> events) {
        return events.stream()
                .map(event -> placeLookupService.findPlace(event.getCategory(), event.getExternalPlaceId())
                        .map(place -> place.getImageUrl())
                        .orElse(null))
                .filter(Objects::nonNull)
                .distinct()
                .limit(5)
                .toList();
    }

    private List<CommunityItineraryDayResponse> itineraryFor(Timeline timeline, List<TimelineEvent> events) {
        Map<LocalDate, List<TimelineEvent>> byDay = events.stream()
                .sorted(Comparator
                        .comparing((TimelineEvent event) -> event.getStartTime().toLocalDate())
                        .thenComparing(TimelineEvent::getOrderIndex, Comparator.nullsLast(Integer::compareTo))
                        .thenComparing(TimelineEvent::getStartTime))
                .collect(Collectors.groupingBy(
                        event -> event.getStartTime().toLocalDate(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        List<CommunityItineraryDayResponse> result = new ArrayList<>();
        byDay.forEach((day, dayEvents) -> {
            List<String> names = dayEvents.stream()
                    .map(event -> placeLookupService.findPlace(event.getCategory(), event.getExternalPlaceId())
                            .map(place -> place.getName())
                            .orElse("Địa điểm"))
                    .toList();
            int dayNumber = Math.max(1, (int) java.time.temporal.ChronoUnit.DAYS.between(timeline.getStartDate(), day) + 1);
            result.add(CommunityItineraryDayResponse.builder()
                    .day(dayNumber)
                    .title(names.isEmpty() ? "Lịch trình" : names.get(0))
                    .summary(String.join(" -> ", names.stream().limit(3).toList()))
                    .build());
        });

        return result.stream().limit(4).toList();
    }

    private List<String> normalizeTags(List<String> tags) {
        if (tags == null) {
            return List.of();
        }
        return tags.stream()
                .map(this::normalizeNullableTag)
                .filter(Objects::nonNull)
                .distinct()
                .limit(6)
                .toList();
    }

    private String normalizeNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeNullableTag(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceFirst("^#", "");
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > 60 ? normalized.substring(0, 60) : normalized;
    }

    private double roundOne(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AppException(ErrorCode.UNAUTHENTICATED);
        }
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
    }
}
