package com.project.backend.modules.notification;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.notification.entity.Notification;
import com.project.backend.modules.notification.entity.NotificationPreference;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import com.project.backend.modules.notification.enums.NotificationType;
import com.project.backend.modules.notification.repository.NotificationPreferenceRepository;
import com.project.backend.modules.notification.repository.NotificationRepository;
import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineMember;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import com.project.backend.modules.timeline.enums.TimelineVisibility;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class NotificationIntegrationTests {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @Autowired
    UserRepository userRepository;

    @Autowired
    TimelineRepository timelineRepository;

    @Autowired
    TimelineMemberRepository timelineMemberRepository;

    @Autowired
    TimelineEventRepository timelineEventRepository;

    @Autowired
    NotificationRepository notificationRepository;

    @Autowired
    NotificationPreferenceRepository notificationPreferenceRepository;

    @BeforeEach
    void setUp() {
        notificationRepository.deleteAll();
        notificationPreferenceRepository.deleteAll();
        timelineEventRepository.deleteAll();
        timelineMemberRepository.deleteAll();
        timelineRepository.deleteAll();
        userRepository.deleteAll();

        userRepository.save(User.builder()
                .username("owner")
                .password("Secret123!")
                .displayName("Owner")
                .build());
        userRepository.save(User.builder()
                .username("member")
                .password("Secret123!")
                .displayName("Member")
                .build());
        userRepository.save(User.builder()
                .username("outsider")
                .password("Secret123!")
                .displayName("Outsider")
                .build());
    }

    @Test
    void registerUser_shouldCreateWelcomeNotification() throws Exception {
        mockMvc.perform(post("/api/v1/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "newuser",
                                  "password": "Password1!",
                                  "displayName": "New User"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.username").value("newuser"));

        assertThat(notificationRepository.count()).isEqualTo(1);
        Notification notification = notificationRepository.findAll().get(0);

        assertThat(notification.getType()).isEqualTo(NotificationType.WELCOME);
        assertThat(notification.getCategory()).isEqualTo(NotificationCategory.SYSTEM);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.UNREAD);
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void inviteMember_shouldCreateCollaborationNotificationForInvitedUser() throws Exception {
        String timelineId = createTimeline();

        mockMvc.perform(put("/api/v1/timelines/{timelineId}/members", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "member",
                                  "role": "EDITOR"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.username").value("member"))
                .andExpect(jsonPath("$.result.role").value("EDITOR"));

        assertThat(notificationRepository.count()).isEqualTo(1);
        Notification invite = notificationRepository.findAll().get(0);

        assertThat(invite.getType()).isEqualTo(NotificationType.COLLABORATION_INVITE);
        assertThat(invite.getSourceModule()).isEqualTo("timeline");
        assertThat(invite.getSourceReferenceId()).isEqualTo(timelineId);
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void updateTimeline_shouldCreateTimelineUpdatedNotificationForCollaborator() throws Exception {
        String timelineId = persistSharedTimeline();
        notificationRepository.deleteAll();

        mockMvc.perform(put("/api/v1/timelines/{timelineId}", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Updated itinerary",
                                  "description": "Updated",
                                  "startDate": "2026-05-01",
                                  "endDate": "2026-05-04",
                                  "visibility": "SHARED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.title").value("Updated itinerary"));

        assertThat(notificationRepository.count()).isEqualTo(1);
        Notification notification = notificationRepository.findAll().get(0);

        assertThat(notification.getType()).isEqualTo(NotificationType.TIMELINE_UPDATED);
        assertThat(notification.getSourceReferenceId()).isEqualTo(timelineId);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.UNREAD);
    }

    @Test
    @WithMockUser(username = "member", roles = "USER")
    void notificationApis_shouldListCountMarkReadAndArchiveOwnNotifications() throws Exception {
        User member = userRepository.findByUsername("member").orElseThrow();
        Notification notification = notificationRepository.save(Notification.builder()
                .user(member)
                .category(NotificationCategory.SYSTEM)
                .type(NotificationType.SYSTEM_ALERT)
                .title("System alert")
                .message("Alert content")
                .payload("{}")
                .status(NotificationStatus.UNREAD)
                .sourceModule("system")
                .sourceReferenceType("alert")
                .sourceReferenceId("alert-1")
                .realtimeEligible(false)
                .build());

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.content[0].id").value(notification.getId()))
                .andExpect(jsonPath("$.result.content[0].type").value("SYSTEM_ALERT"));

        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.unreadCount").value(1));

        mockMvc.perform(patch("/api/v1/notifications/{notificationId}/read", notification.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.status").value("READ"));

        mockMvc.perform(delete("/api/v1/notifications/{notificationId}", notification.getId()))
                .andExpect(status().isOk());

        Notification archived = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(archived.getStatus()).isEqualTo(NotificationStatus.ARCHIVED);
        assertThat(archived.getArchivedAt()).isNotNull();
    }

    @Test
    @WithMockUser(username = "member", roles = "USER")
    void preferencesAndOwnership_shouldUpdatePreferencesAndDenyForeignNotificationAccess() throws Exception {
        User member = userRepository.findByUsername("member").orElseThrow();
        User outsider = userRepository.findByUsername("outsider").orElseThrow();
        Notification foreignNotification = notificationRepository.save(Notification.builder()
                .user(outsider)
                .category(NotificationCategory.SYSTEM)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Foreign")
                .message("Foreign")
                .payload("{}")
                .status(NotificationStatus.UNREAD)
                .sourceModule("system")
                .sourceReferenceType("alert")
                .sourceReferenceId("alert-2")
                .realtimeEligible(false)
                .build());

        mockMvc.perform(put("/api/v1/notifications/preferences/{category}", "TIMELINE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "inAppEnabled": true,
                                  "realtimeEnabled": false
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.category").value("TIMELINE"))
                .andExpect(jsonPath("$.result.realtimeEnabled").value(false));

        NotificationPreference preference = notificationPreferenceRepository.findByUser_IdAndCategory(
                        member.getId(),
                        NotificationCategory.TIMELINE
                )
                .orElseThrow();
        assertThat(preference.getRealtimeEnabled()).isFalse();

        mockMvc.perform(patch("/api/v1/notifications/{notificationId}/read", foreignNotification.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(6001));
    }

    private String createTimeline() throws Exception {
        String response = mockMvc.perform(post("/api/v1/timelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Shared timeline",
                                  "description": "Trip",
                                  "startDate": "2026-05-01",
                                  "endDate": "2026-05-03",
                                  "visibility": "SHARED"
                                }
                                """))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readResultId(response);
    }

    private String persistSharedTimeline() {
        User owner = userRepository.findByUsername("owner").orElseThrow();
        User member = userRepository.findByUsername("member").orElseThrow();

        Timeline timeline = timelineRepository.save(Timeline.builder()
                .title("Shared timeline")
                .description("Trip")
                .startDate(LocalDate.of(2026, 5, 1))
                .endDate(LocalDate.of(2026, 5, 3))
                .visibility(TimelineVisibility.SHARED)
                .owner(owner)
                .build());

        timelineMemberRepository.save(TimelineMember.builder()
                .timeline(timeline)
                .user(owner)
                .role(TimelineMemberRole.OWNER)
                .build());
        timelineMemberRepository.save(TimelineMember.builder()
                .timeline(timeline)
                .user(member)
                .role(TimelineMemberRole.EDITOR)
                .build());

        return timeline.getId();
    }

    private String readResultId(String response) throws Exception {
        JsonNode node = objectMapper.readTree(response);
        return node.path("result").path("id").asText();
    }
}
