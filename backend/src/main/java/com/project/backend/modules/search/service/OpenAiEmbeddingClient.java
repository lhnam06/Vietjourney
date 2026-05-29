package com.project.backend.modules.search.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.project.backend.modules.search.config.SearchHybridProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
@RequiredArgsConstructor
public class OpenAiEmbeddingClient {
    private final SearchHybridProperties properties;

    public boolean isConfigured() {
        return properties.hasOpenAiCredentials();
    }

    public List<List<Double>> embedAll(List<String> inputs) {
        if (!isConfigured()) {
            throw new IllegalStateException("OPENAI_API_KEY is required for vector search");
        }

        RestClient client = RestClient.builder()
                .baseUrl(properties.getOpenaiBaseUrl())
                .defaultHeader("Authorization", "Bearer " + properties.getOpenaiApiKey())
                .build();

        EmbeddingResponse response = client.post()
                .uri("/v1/embeddings")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new EmbeddingRequest(
                        inputs,
                        properties.getEmbeddingModel(),
                        properties.getEmbeddingDimensions(),
                        "float"
                ))
                .retrieve()
                .body(EmbeddingResponse.class);

        if (response == null || response.data() == null || response.data().isEmpty()) {
            throw new IllegalStateException("Embedding response was empty");
        }

        return response.data().stream()
                .map(EmbeddingData::embedding)
                .toList();
    }

    public List<Double> embedOne(String input) {
        return embedAll(List.of(input)).get(0);
    }

    private record EmbeddingRequest(
            List<String> input,
            String model,
            Integer dimensions,
            @JsonProperty("encoding_format") String encodingFormat
    ) {
    }

    private record EmbeddingResponse(List<EmbeddingData> data) {
    }

    private record EmbeddingData(List<Double> embedding) {
    }
}
