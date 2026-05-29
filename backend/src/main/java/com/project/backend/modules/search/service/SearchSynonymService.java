package com.project.backend.modules.search.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.search.config.SearchNormalizer;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class SearchSynonymService {
    private static final TypeReference<Map<String, List<String>>> TYPE = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final Map<String, Set<String>> reverseIndex = new LinkedHashMap<>();

    @PostConstruct
    void loadSynonyms() {
        try (InputStream inputStream = new ClassPathResource("synonyms.json").getInputStream()) {
            Map<String, List<String>> raw = objectMapper.readValue(inputStream, TYPE);
            raw.forEach((group, values) -> indexGroup(values));
        } catch (Exception ignored) {
            reverseIndex.clear();
        }
    }

    public List<String> expand(String query) {
        String normalizedQuery = SearchNormalizer.normalize(query);
        if (normalizedQuery.isBlank()) {
            return List.of();
        }

        LinkedHashSet<String> expanded = new LinkedHashSet<>();
        expanded.add(normalizedQuery);

        for (String token : normalizedQuery.split(" ")) {
            if (!token.isBlank()) {
                expanded.add(token);
            }
        }

        reverseIndex.forEach((term, groupTerms) -> {
            if (normalizedQuery.contains(term) || term.contains(normalizedQuery)) {
                expanded.addAll(groupTerms);
            }
        });

        return expanded.stream()
                .filter(value -> !value.isBlank())
                .limit(12)
                .toList();
    }

    private void indexGroup(Collection<String> values) {
        LinkedHashSet<String> normalizedTerms = new LinkedHashSet<>();
        for (String value : values) {
            String normalized = SearchNormalizer.normalize(value);
            if (!normalized.isBlank()) {
                normalizedTerms.add(normalized);
            }
        }

        if (normalizedTerms.isEmpty()) {
            return;
        }

        List<String> materializedTerms = new ArrayList<>(normalizedTerms);
        for (String term : materializedTerms) {
            reverseIndex.computeIfAbsent(term, ignored -> new LinkedHashSet<>()).addAll(materializedTerms);
        }
    }
}
