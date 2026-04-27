package com.project.backend.modules.place;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.place.repository.PlaceQueryRepository;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import com.project.backend.modules.timeline.repository.TimelineMemberRepository;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import jakarta.persistence.Tuple;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class PlaceToTimelineFlowIntegrationTests {
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

    @MockBean
    PlaceQueryRepository placeQueryRepository;

    @MockBean
    PlaceMapper placeMapper;

    @MockBean
    PlaceLookupService placeLookupService;

    @BeforeEach
    void setUp() {
        timelineEventRepository.deleteAll();
        timelineMemberRepository.deleteAll();
        timelineRepository.deleteAll();
        userRepository.deleteAll();

        userRepository.save(User.builder()
                .username("owner")
                .password("Secret123!")
                .displayName("Owner")
                .build());
    }

    @Test
    @WithMockUser(username = "owner", roles = "USER")
    void filterPlace_thenUseReturnedPlaceInTimelineEvent_shouldCreateHydratedEvent() throws Exception {
        Tuple tuple = mock(Tuple.class);
        PlaceResponse filteredPlace = PlaceResponse.builder()
                .id("129")
                .name("Mock Place 129")
                .address("Mock Address 129")
                .category("food")
                .district("District 1")
                .images(List.of("https://img.test/129.jpg"))
                .rating(4.8)
                .latitude(10.7)
                .longitude(106.6)
                .build();
        PlaceSummary placeSummary = PlaceSummary.builder()
                .id("129")
                .name("Mock Place 129")
                .address("Mock Address 129")
                .rating(BigDecimal.valueOf(4.8))
                .latitude(10.7)
                .longitude(106.6)
                .district("District 1")
                .imageUrl("https://img.test/129.jpg")
                .build();

        when(placeQueryRepository.findByFilter(any())).thenReturn(List.of(tuple));
        when(placeQueryRepository.countByFilter(any())).thenReturn(1L);
        when(placeMapper.toResponse(tuple)).thenReturn(filteredPlace);
        doNothing().when(placeLookupService).assertPlaceExists(eq(com.project.backend.modules.timeline.enums.TimelineEventCategory.FOOD), eq("129"));
        when(placeLookupService.findPlace(com.project.backend.modules.timeline.enums.TimelineEventCategory.FOOD, "129"))
                .thenReturn(Optional.of(placeSummary));

        String timelineId = createTimeline();

        String filterResponse = mockMvc.perform(post("/api/v1/places/filter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "food",
                                  "district": "District 1",
                                  "page": 0,
                                  "size": 10
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.data[0].id").value("129"))
                .andExpect(jsonPath("$.result.data[0].category").value("food"))
                .andReturn()
                .getResponse()
                .getContentAsString();

        JsonNode placeNode = objectMapper.readTree(filterResponse).path("result").path("data").get(0);
        String placeId = placeNode.path("id").asText();
        String timelineCategory = placeNode.path("category").asText().toUpperCase();

        mockMvc.perform(post("/api/v1/timelines/{timelineId}/events", timelineId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "externalPlaceId": "%s",
                                  "category": "%s",
                                  "startTime": "2026-05-01T08:00:00",
                                  "endTime": "2026-05-01T10:00:00",
                                  "orderIndex": 0,
                                  "notes": "Pulled from place filter"
                                }
                                """.formatted(placeId, timelineCategory)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.externalPlaceId").value("129"))
                .andExpect(jsonPath("$.result.category").value("FOOD"))
                .andExpect(jsonPath("$.result.notes").value("Pulled from place filter"))
                .andExpect(jsonPath("$.result.place.id").value("129"))
                .andExpect(jsonPath("$.result.place.name").value("Mock Place 129"))
                .andExpect(jsonPath("$.result.place.imageUrl").value("https://img.test/129.jpg"));

        ArgumentCaptor<com.project.backend.modules.place.dto.request.PlaceFilterRequest> captor =
                ArgumentCaptor.forClass(com.project.backend.modules.place.dto.request.PlaceFilterRequest.class);
        verify(placeQueryRepository).findByFilter(captor.capture());
        assertThat(captor.getValue().getCategory()).isEqualTo("food");
    }

    private String createTimeline() throws Exception {
        String response = mockMvc.perform(post("/api/v1/timelines")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title": "Place to timeline flow",
                                  "description": "Trip",
                                  "startDate": "2026-05-01",
                                  "endDate": "2026-05-03",
                                  "visibility": "SHARED"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        return objectMapper.readTree(response).path("result").path("id").asText();
    }
}
