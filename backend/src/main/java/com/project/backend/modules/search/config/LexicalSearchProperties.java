package com.project.backend.modules.search.config;

import lombok.AccessLevel;
import lombok.Data;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "search.lexical")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class LexicalSearchProperties {
    double keywordThreshold = 0.18d;
    int maxPageSize = 30;
}
