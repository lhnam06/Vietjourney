package com.project.backend.modules.search.config;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "search.hybrid")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SearchHybridProperties {
    String openaiBaseUrl;
    String openaiApiKey;
    String embeddingModel;
    Integer embeddingDimensions = 1536;
    double keywordWeight = 0.45d;
    double vectorWeight = 0.55d;
    double keywordThreshold = 0.2d;
    double vectorThreshold = 0.2d;
    int candidateLimit = 200;
    int reindexBatchSize = 32;

    public boolean hasOpenAiCredentials() {
        return openaiApiKey != null && !openaiApiKey.isBlank();
    }
}
