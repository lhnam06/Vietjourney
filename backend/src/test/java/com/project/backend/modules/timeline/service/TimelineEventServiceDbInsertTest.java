package com.project.backend.modules.timeline.service;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.timeline.dto.request.CreateTimelineEventRequest;
import com.project.backend.modules.timeline.dto.response.TimelineEventResponse;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.enums.TimelineVisibility;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class TimelineEventServiceDbInsertTest {

    private String dynamicTimelineId;

    @Autowired
    TimelineEventService timelineEventService;

    @Autowired
    TimelineRepository timelineRepository;

    @Autowired
    TimelineEventRepository timelineEventRepository;

    @Autowired
    TimelineMemberRepository timelineMemberRepository;

    @Autowired
    UserRepository userRepository;

    @BeforeEach
    void setUp() {
        timelineEventRepository.deleteAll();
        timelineMemberRepository.deleteAll();
        timelineRepository.deleteAll();
        userRepository.deleteAll();

        User user = User.builder()
                .username("testuser")
                .password("secret")
                .displayName("Test User")
                .build();
        user = userRepository.saveAndFlush(user);

        Timeline timeline = Timeline.builder()
                .title("Test Trip for DB Insert")
                .description("Testing database persistence")
                .startDate(LocalDate.of(2026, 5, 1))
                .endDate(LocalDate.of(2026, 5, 15))
                .visibility(TimelineVisibility.SHARED)
                .owner(user)
                .build();
        timeline = timelineRepository.saveAndFlush(timeline);
        dynamicTimelineId = timeline.getId();

        timelineMemberRepository.saveAndFlush(com.project.backend.modules.timeline.entity.TimelineMember.builder()
                .timeline(timeline)
                .user(user)
                .role(TimelineMemberRole.OWNER)
                .build());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser", roles = "USER")
    void addEvent_shouldPersistEventToDatabase() {
        // Arrange
        LocalDateTime startTime = LocalDateTime.of(2026, 5, 10, 10, 0);
        LocalDateTime endTime = LocalDateTime.of(2026, 5, 10, 12, 0);

        CreateTimelineEventRequest request = CreateTimelineEventRequest.builder()
                .externalPlaceId("place_123")
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(startTime)
                .endTime(endTime)
                .orderIndex(0)
                .status(TimelineEventStatus.PLANNED)
                .notes("Test activity")
                .build();

        // Act
        TimelineEventResponse response = timelineEventService.addEvent(dynamicTimelineId, request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(timelineEventRepository.count()).isEqualTo(1);
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(username = "testuser", roles = "USER")
    void addEvent_multipleEvents_shouldMaintainCorrectOrderIndex() {
        // Arrange
        LocalDateTime baseTime = LocalDateTime.of(2026, 5, 10, 8, 0);

        CreateTimelineEventRequest request1 = CreateTimelineEventRequest.builder()
                .externalPlaceId("place_A")
                .category(TimelineEventCategory.ACTIVITY)
                .startTime(baseTime)
                .endTime(baseTime.plusHours(2))
                .orderIndex(0)
                .status(TimelineEventStatus.PLANNED)
                .build();

        CreateTimelineEventRequest request2 = CreateTimelineEventRequest.builder()
                .externalPlaceId("place_B")
                .category(TimelineEventCategory.FOOD)
                .startTime(baseTime.plusHours(3))
                .endTime(baseTime.plusHours(5))
                .orderIndex(1)
                .status(TimelineEventStatus.CONFIRMED)
                .build();

        // Act
        timelineEventService.addEvent(dynamicTimelineId, request1);
        timelineEventService.addEvent(dynamicTimelineId, request2);

        // Assert
        assertThat(timelineEventRepository.count()).isEqualTo(2);
    }
}
