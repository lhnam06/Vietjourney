package com.project.backend.modules.search;

import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.search.repository.LexicalSearchRepository;
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
class LexicalSearchIntegrationTests {
    @Autowired
    MockMvc mockMvc;

    @MockBean
    LexicalSearchRepository lexicalSearchRepository;

    @MockBean
    SearchSynonymService searchSynonymService;

    @MockBean
    PlaceMapper placeMapper;

    @Test
    void lexicalSearchShouldRejectInvalidCategory() throws Exception {
        mockMvc.perform(get("/api/v1/search/lexical")
                        .param("q", "coffee")
                        .param("category", "hotel"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value(4004));
    }

    @Test
    void lexicalSearchShouldReturnPagedResults() throws Exception {
        Tuple tuple = mock(Tuple.class);
        PlaceResponse placeResponse = PlaceResponse.builder()
                .id("place-1")
                .name("Hidden Cafe")
                .category("food")
                .district("District 1")
                .rating(4.8)
                .build();

        when(searchSynonymService.expand(any())).thenReturn(List.of("coffee", "cafe"));
        when(lexicalSearchRepository.search(any(), any(), anyList(), anyDouble()))
                .thenReturn(List.of(tuple));
        when(lexicalSearchRepository.count(any(), any(), anyList(), anyDouble()))
                .thenReturn(1L);
        when(placeMapper.toResponse(tuple)).thenReturn(placeResponse);

        mockMvc.perform(get("/api/v1/search/lexical")
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

        ArgumentCaptor<com.project.backend.modules.search.dto.request.LexicalSearchRequest> captor =
                ArgumentCaptor.forClass(com.project.backend.modules.search.dto.request.LexicalSearchRequest.class);
        verify(lexicalSearchRepository).search(captor.capture(), any(), anyList(), anyDouble());

        assertThat(captor.getValue().getCategory()).isEqualTo("food");
        assertThat(captor.getValue().getPage()).isEqualTo(0);
        assertThat(captor.getValue().getSize()).isEqualTo(10);
    }

    @Test
    void legacyHybridEndpointShouldUseLexicalSearch() throws Exception {
        when(searchSynonymService.expand(any())).thenReturn(List.of("coffee", "cafe"));
        when(lexicalSearchRepository.search(any(), any(), anyList(), anyDouble()))
                .thenReturn(List.of());
        when(lexicalSearchRepository.count(any(), any(), anyList(), anyDouble()))
                .thenReturn(0L);

        mockMvc.perform(get("/api/v1/search/hybrid")
                        .param("q", "cf"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.total").value(0));
    }
}
