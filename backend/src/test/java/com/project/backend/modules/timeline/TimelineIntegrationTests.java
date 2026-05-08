package com.project.backend.modules.timeline;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.place.service.PlaceLookupService;
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
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class TimelineIntegrationTests {
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

    @BeforeEach
    void setUp() {
        timelineEventRepository.deleteAll();
        timelineMemberRepository.deleteAll();
        timelineRepository.deleteAll();
        userRepository.deleteAll();

        userRepository.save(User.builder()
                .username("owner")
                .password("secret")
                .displayName("Timeline Owner")
                .build());
        userRepository.save(User.builder()
                .username("outsider")
                .password("secret")
                .displayName("Timeline Outsider")
                .build());
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void createTimeline_shouldPersistOwnerAndReturnTimeline() throws Exception {
        mockMvc.perform(post("/api/v1/timelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Da Nang trip",
                                  "description": "Planning board",
                                  "startDate": "2026-05-01",
                                  "endDate": "2026-05-03",
                                  "visibility": "SHARED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.title").value("Da Nang trip"))
                .andExpect(jsonPath("$.result.ownerUsername").value("owner"))
                .andExpect(jsonPath("$.result.members[0].role").value("OWNER"));

        assertThat(timelineRepository.count()).isEqualTo(1);
        assertThat(timelineMemberRepository.count()).isEqualTo(1);
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void addEvent_shouldHydratePlaceSummary() throws Exception {
        String timelineId = createTimeline();

        mockMvc.perform(post("/api/v1/timelines/{timelineId}/events", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "externalPlaceId": "129",
                                  "category": "FOOD",
                                  "startTime": "2026-05-01T08:00:00",
                                  "endTime": "2026-05-01T10:00:00",
                                  "orderIndex": 0,
                                  "notes": "Breakfast"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.externalPlaceId").value("129"))
                .andExpect(jsonPath("$.result.category").value("FOOD"))
                .andExpect(jsonPath("$.result.place.id").value("129"))
                .andExpect(jsonPath("$.result.place.name").value("Mock Place 129"))
                .andExpect(jsonPath("$.result.place.imageUrl").value("https://img.test/129.jpg"));
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void getEvent_shouldReturnHydratedPlaceSummaryWithinTimelineBoundary() throws Exception {
        String timelineId = createTimeline();

        String response = mockMvc.perform(post("/api/v1/timelines/{timelineId}/events", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "externalPlaceId": "129",
                                  "category": "FOOD",
                                  "startTime": "2026-05-01T08:00:00",
                                  "endTime": "2026-05-01T10:00:00",
                                  "orderIndex": 0,
                                  "notes": "Breakfast"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        String eventId = readResultId(response);

        mockMvc.perform(get("/api/v1/timelines/{timelineId}/events/{eventId}", timelineId, eventId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.id").value(eventId))
                .andExpect(jsonPath("$.result.externalPlaceId").value("129"))
                .andExpect(jsonPath("$.result.notes").value("Breakfast"))
                .andExpect(jsonPath("$.result.place.id").value("129"))
                .andExpect(jsonPath("$.result.place.name").value("Mock Place 129"))
                .andExpect(jsonPath("$.result.place.imageUrl").value("https://img.test/129.jpg"));
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void addEvent_shouldRejectOverlap() throws Exception {
        String timelineId = createTimeline();
        addEvent(timelineId, "129", TimelineEventCategory.FOOD, LocalDateTime.of(2026, 5, 1, 8, 0), LocalDateTime.of(2026, 5, 1, 10, 0), 0);

        mockMvc.perform(post("/api/v1/timelines/{timelineId}/events", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "externalPlaceId": "101",
                                  "category": "DRINK",
                                  "startTime": "2026-05-01T09:30:00",
                                  "endTime": "2026-05-01T11:00:00",
                                  "orderIndex": 1
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(5008));
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void reorderEvent_shouldNormalizeOrderIndexes() throws Exception {
        String timelineId = createTimeline();
        String eventA = addEvent(timelineId, "129", TimelineEventCategory.FOOD, LocalDateTime.of(2026, 5, 1, 8, 0), LocalDateTime.of(2026, 5, 1, 9, 0), 0);
        String eventB = addEvent(timelineId, "101", TimelineEventCategory.DRINK, LocalDateTime.of(2026, 5, 1, 9, 30), LocalDateTime.of(2026, 5, 1, 10, 30), 1);

        mockMvc.perform(patch("/api/v1/timelines/{timelineId}/events/{eventId}/reorder", timelineId, eventB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "orderIndex": 0
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.id").value(eventB))
                .andExpect(jsonPath("$.result.orderIndex").value(0));

        mockMvc.perform(get("/api/v1/timelines/{timelineId}/events", timelineId)
                        .param("rangeStart", "2026-05-01T00:00:00")
                        .param("rangeEnd", "2026-05-02T00:00:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].id").value(eventB))
                .andExpect(jsonPath("$.result[0].orderIndex").value(0))
                .andExpect(jsonPath("$.result[1].id").value(eventA))
                .andExpect(jsonPath("$.result[1].orderIndex").value(1));
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void getEvent_shouldRejectEventFromAnotherTimeline() throws Exception {
        String timelineA = createTimeline("Timeline A");
        String timelineB = createTimeline("Timeline B");
        String eventId = addEvent(
                timelineA,
                "129",
                TimelineEventCategory.FOOD,
                LocalDateTime.of(2026, 5, 1, 8, 0),
                LocalDateTime.of(2026, 5, 1, 9, 0),
                0
        );

        mockMvc.perform(get("/api/v1/timelines/{timelineId}/events/{eventId}", timelineB, eventId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value(5002));
    }

    @Test
    @WithMockUser(username = "outsider", roles = "USER")
    void getEvent_shouldRequireViewAccess() throws Exception {
        String timelineId = persistTimeline("owner", "Private Timeline");
        String eventId = addEvent(
                timelineId,
                "129",
                TimelineEventCategory.FOOD,
                LocalDateTime.of(2026, 5, 1, 8, 0),
                LocalDateTime.of(2026, 5, 1, 9, 0),
                0
        );

        mockMvc.perform(get("/api/v1/timelines/{timelineId}/events/{eventId}", timelineId, eventId))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value(5009));
    }

    private String createTimeline() throws Exception {
        return createTimeline("Da Nang trip");
    }

    private String createTimeline(String title) throws Exception {
        String response = mockMvc.perform(post("/api/v1/timelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "%s",
                                  "description": "Planning board",
                                  "startDate": "2026-05-01",
                                  "endDate": "2026-05-03",
                                  "visibility": "SHARED"
                                }
                                """.formatted(title)))
                .andReturn()
                .getResponse()
                .getContentAsString();
        return readResultId(response);
    }

    private String persistTimeline(String ownerUsername, String title) {
        User owner = userRepository.findByUsername(ownerUsername).orElseThrow();
        Timeline timeline = timelineRepository.save(Timeline.builder()
                .title(title)
                .description("Planning board")
                .startDate(LocalDate.of(2026, 5, 1))
                .endDate(LocalDate.of(2026, 5, 3))
                .visibility(TimelineVisibility.PRIVATE)
                .owner(owner)
                .build());
        timelineMemberRepository.save(com.project.backend.modules.timeline.entity.TimelineMember.builder()
                .timeline(timeline)
                .user(owner)
                .role(TimelineMemberRole.OWNER)
                .build());
        return timeline.getId();
    }

    private String addEvent(
            String timelineId,
            String externalPlaceId,
            TimelineEventCategory category,
            LocalDateTime startTime,
            LocalDateTime endTime,
            int orderIndex
    ) {
        Timeline timeline = timelineRepository.findById(timelineId).orElseThrow();
        TimelineEvent event = TimelineEvent.builder()
                .timeline(timeline)
                .externalPlaceId(externalPlaceId)
                .category(category)
                .startTime(startTime)
                .endTime(endTime)
                .orderIndex(orderIndex)
                .status(TimelineEventStatus.PLANNED)
                .build();
        return timelineEventRepository.save(event).getId();
    }

    private String readResultId(String response) throws Exception {
        JsonNode node = objectMapper.readTree(response);
        return node.path("result").path("id").asText();
    }

    @TestConfiguration
    static class TimelineTestConfig {
        @Bean
        @Primary
        PlaceLookupService placeLookupService() {
            Map<String, PlaceSummary> places = Map.of(
                    "129", PlaceSummary.builder()
                            .id("129")
                            .name("Mock Place 129")
                            .address("Mock Address 129")
                            .rating(BigDecimal.valueOf(4.5))
                            .latitude(10.7)
                            .longitude(106.6)
                            .district("Binh Chanh")
                            .imageUrl("https://img.test/129.jpg")
                            .build(),
                    "101", PlaceSummary.builder()
                            .id("101")
                            .name("Mock Place 101")
                            .address("Mock Address 101")
                            .rating(BigDecimal.valueOf(4.9))
                            .latitude(10.8)
                            .longitude(106.5)
                            .district("District 1")
                            .imageUrl("https://img.test/101.jpg")
                            .build()
            );

            return new PlaceLookupService() {
                @Override
                public void assertPlaceExists(TimelineEventCategory category, String externalPlaceId) {
                    if (!places.containsKey(externalPlaceId)) {
                        throw new IllegalArgumentException("Missing place " + externalPlaceId);
                    }
                }

                @Override
                public Optional<PlaceSummary> findPlace(TimelineEventCategory category, String externalPlaceId) {
                    return Optional.ofNullable(places.get(externalPlaceId));
                }
            };
        }
    }
}
