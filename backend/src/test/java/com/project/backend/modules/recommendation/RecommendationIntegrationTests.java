package com.project.backend.modules.recommendation;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.auth.repository.UserRepository;
import com.project.backend.modules.recommendation.repository.RecommendationPlaceCandidate;
import com.project.backend.modules.recommendation.repository.RecommendationPlaceRepository;
import com.project.backend.modules.recommendation.repository.UserCategoryPreferenceRepository;
import com.project.backend.modules.recommendation.repository.UserDistrictPreferenceRepository;
import com.project.backend.modules.recommendation.repository.UserPlaceInteractionRepository;
import com.project.backend.modules.recommendation.repository.UserTagPreferenceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class RecommendationIntegrationTests {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    UserRepository userRepository;

    @Autowired
    UserPlaceInteractionRepository interactionRepository;

    @Autowired
    UserTagPreferenceRepository tagPreferenceRepository;

    @Autowired
    UserDistrictPreferenceRepository districtPreferenceRepository;

    @Autowired
    UserCategoryPreferenceRepository categoryPreferenceRepository;

    @MockBean
    RecommendationPlaceRepository placeRepository;

    @BeforeEach
    void setUp() {
        interactionRepository.deleteAll();
        tagPreferenceRepository.deleteAll();
        districtPreferenceRepository.deleteAll();
        categoryPreferenceRepository.deleteAll();
        if (userRepository.findByUsername("rec-owner").isEmpty()) {
            userRepository.save(User.builder()
                    .username("rec-owner")
                    .password("password")
                    .displayName("Recommendation Owner")
                    .build());
        }
    }

    @Test
    @WithMockUser(username = "rec-owner", roles = "USER")
    void recordInteraction_shouldUpdateUserProfileWeights() throws Exception {
        when(placeRepository.findByCategoryAndId("food", "place-1"))
                .thenReturn(Optional.of(RecommendationPlaceCandidate.builder()
                        .id("place-1")
                        .category("food")
                        .district("District 1")
                        .tags(Map.of(
                                "vibe", List.of("cozy"),
                                "purpose", List.of("date")
                        ))
                        .build()));

        mockMvc.perform(post("/api/v1/recommendations/interactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "placeId": "place-1",
                                  "category": "food",
                                  "eventType": "ADD_TO_TIMELINE"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.recorded").value(1));

        User owner = userRepository.findByUsername("rec-owner").orElseThrow();
        assertThat(interactionRepository.findAll()).hasSize(1);
        assertThat(tagPreferenceRepository.findByUser_IdAndTagGroupAndTagValue(owner.getId(), "vibe", "cozy"))
                .isPresent()
                .get()
                .extracting("score")
                .isEqualTo(6.0);
        assertThat(tagPreferenceRepository.findByUser_IdAndTagGroupAndTagValue(owner.getId(), "purpose", "date"))
                .isPresent()
                .get()
                .extracting("score")
                .isEqualTo(6.0);
        assertThat(districtPreferenceRepository.findByUser_IdAndDistrict(owner.getId(), "district 1"))
                .isPresent()
                .get()
                .extracting("score")
                .isEqualTo(6.0);
        assertThat(categoryPreferenceRepository.findByUser_IdAndCategory(owner.getId(), "food"))
                .isPresent()
                .get()
                .extracting("score")
                .isEqualTo(6.0);
    }

    @Test
    @WithMockUser(username = "rec-owner", roles = "USER")
    void recommendPlaces_shouldRankByTagAndDistrictProfile() throws Exception {
        when(placeRepository.findByCategoryAndId("food", "place-1"))
                .thenReturn(Optional.of(RecommendationPlaceCandidate.builder()
                        .id("place-1")
                        .category("food")
                        .district("District 1")
                        .tags(Map.of("vibe", List.of("cozy"), "purpose", List.of("date")))
                        .build()));
        when(placeRepository.findCandidates(anyInt(), anySet(), anySet())).thenReturn(List.of(
                RecommendationPlaceCandidate.builder()
                        .id("matched")
                        .name("Matched Place")
                        .category("food")
                        .district("district 1")
                        .rating(4.2)
                        .tags(Map.of("vibe", List.of("cozy"), "purpose", List.of("date")))
                        .build(),
                RecommendationPlaceCandidate.builder()
                        .id("other")
                        .name("Other Place")
                        .category("drink")
                        .district("district 7")
                        .rating(5.0)
                        .tags(Map.of("vibe", List.of("modern")))
                        .build()
        ));

        mockMvc.perform(post("/api/v1/recommendations/interactions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "placeId": "place-1",
                                  "category": "food",
                                  "eventType": "ADD_TO_TIMELINE"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/recommendations/places?size=2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result[0].id").value("matched"))
                .andExpect(jsonPath("$.result[0].debug.totalScore").isNumber())
                .andExpect(jsonPath("$.result[1].id").value("other"));
    }
}
