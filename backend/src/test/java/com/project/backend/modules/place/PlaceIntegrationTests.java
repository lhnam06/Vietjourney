package com.project.backend.modules.place;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.place.repository.PlaceQueryRepository;
import jakarta.persistence.Tuple;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class PlaceIntegrationTests {
    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockBean
    PlaceQueryRepository placeQueryRepository;

    @MockBean
    PlaceMapper placeMapper;

    @Test
    void filterPlaces_shouldRejectInvalidCategory() throws Exception {
        mockMvc.perform(post("/api/v1/places/filter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "hotel",
                                  "page": 0,
                                  "size": 10
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(4004));
    }

    @Test
    void filterPlaces_shouldRejectInvalidPriceRange() throws Exception {
        mockMvc.perform(post("/api/v1/places/filter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "food",
                                  "minPrice": 500000,
                                  "maxPrice": 100000,
                                  "page": 0,
                                  "size": 10
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(4005));
    }

    @Test
    void filterPlaces_shouldReturnPagedResultsAndNormalizeInvalidPageSize() throws Exception {
        Tuple tuple = mock(Tuple.class);
        PlaceResponse placeResponse = PlaceResponse.builder()
                .id("place-1")
                .name("Place One")
                .category("food")
                .district("District 1")
                .rating(4.7)
                .build();

        when(placeQueryRepository.findByFilter(any())).thenReturn(List.of(tuple));
        when(placeQueryRepository.countByFilter(any())).thenReturn(1L);
        when(placeMapper.toResponse(tuple)).thenReturn(placeResponse);

        mockMvc.perform(post("/api/v1/places/filter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "category": "food",
                                  "district": "District 1",
                                  "page": -3,
                                  "size": 0
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.data[0].id").value("place-1"))
                .andExpect(jsonPath("$.result.data[0].name").value("Place One"))
                .andExpect(jsonPath("$.result.total").value(1))
                .andExpect(jsonPath("$.result.page").value(0))
                .andExpect(jsonPath("$.result.size").value(20))
                .andExpect(jsonPath("$.result.totalPages").value(1));

        ArgumentCaptor<com.project.backend.modules.place.dto.request.PlaceFilterRequest> captor =
                ArgumentCaptor.forClass(com.project.backend.modules.place.dto.request.PlaceFilterRequest.class);
        verify(placeQueryRepository).findByFilter(captor.capture());

        assertThat(captor.getValue().getPage()).isEqualTo(0);
        assertThat(captor.getValue().getSize()).isEqualTo(20);
        assertThat(captor.getValue().getCategory()).isEqualTo("food");
    }
}
