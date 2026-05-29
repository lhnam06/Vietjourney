package com.project.backend.modules.search;

import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.search.repository.HybridSearchRepository;
import com.project.backend.modules.search.service.OpenAiEmbeddingClient;
import com.project.backend.modules.search.service.SearchSynonymService;
import jakarta.persistence.Tuple;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
class HybridSearchIntegrationTests {
    @Autowired
    MockMvc mockMvc;

    @MockBean
    HybridSearchRepository hybridSearchRepository;

    @MockBean
    SearchSynonymService searchSynonymService;

    @MockBean
    OpenAiEmbeddingClient openAiEmbeddingClient;

    @MockBean
    PlaceMapper placeMapper;

    @Test
    void hybridSearchShouldRejectInvalidCategory() throws Exception {
        mockMvc.perform(get("/api/v1/search/hybrid")
                        .param("q", "coffee")
                        .param("category", "hotel"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(4004));
    }

    @Test
    void hybridSearchShouldReturnPagedResults() throws Exception {
        Tuple tuple = mock(Tuple.class);
        PlaceResponse placeResponse = PlaceResponse.builder()
                .id("place-1")
                .name("Hidden Cafe")
                .category("food")
                .district("District 1")
                .rating(4.8)
                .build();

        when(searchSynonymService.expand(any())).thenReturn(List.of("coffee", "cafe"));
        when(openAiEmbeddingClient.isConfigured()).thenReturn(false);
        when(hybridSearchRepository.search(any(), any(), anyList(), any(), anyInt(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(List.of(tuple));
        when(hybridSearchRepository.count(any(), any(), anyList(), any(), anyInt(), anyDouble(), anyDouble(), anyDouble(), anyDouble()))
                .thenReturn(1L);
        when(placeMapper.toResponse(tuple)).thenReturn(placeResponse);

        mockMvc.perform(get("/api/v1/search/hybrid")
                        .param("q", "coffee")
                        .param("category", "food")
                        .param("page", "-2")
                        .param("size", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.data[0].id").value("place-1"))
                .andExpect(jsonPath("$.result.data[0].name").value("Hidden Cafe"))
                .andExpect(jsonPath("$.result.total").value(1))
                .andExpect(jsonPath("$.result.page").value(0))
                .andExpect(jsonPath("$.result.size").value(10))
                .andExpect(jsonPath("$.result.totalPages").value(1));

        ArgumentCaptor<com.project.backend.modules.search.dto.request.HybridSearchRequest> captor =
                ArgumentCaptor.forClass(com.project.backend.modules.search.dto.request.HybridSearchRequest.class);
        verify(hybridSearchRepository).search(captor.capture(), any(), anyList(), any(), anyInt(), anyDouble(), anyDouble(), anyDouble(), anyDouble());

        assertThat(captor.getValue().getCategory()).isEqualTo("food");
        assertThat(captor.getValue().getPage()).isEqualTo(0);
        assertThat(captor.getValue().getSize()).isEqualTo(10);
    }
}
