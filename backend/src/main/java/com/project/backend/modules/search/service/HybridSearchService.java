package com.project.backend.modules.search.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.place.dto.response.PageResponse;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import com.project.backend.modules.place.mapper.PlaceMapper;
import com.project.backend.modules.search.config.SearchHybridProperties;
import com.project.backend.modules.search.config.SearchNormalizer;
import com.project.backend.modules.search.dto.request.HybridSearchRequest;
import com.project.backend.modules.search.dto.response.EmbeddingReindexResponse;
import com.project.backend.modules.search.repository.HybridSearchRepository;
import jakarta.persistence.Tuple;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class HybridSearchService {
    private static final Set<String> VALID_CATEGORIES = Set.of("food", "drink", "activity");

    private final HybridSearchRepository hybridSearchRepository;
    private final SearchHybridProperties properties;
    private final SearchSynonymService searchSynonymService;
    private final OpenAiEmbeddingClient openAiEmbeddingClient;
    private final PlaceMapper placeMapper;

    public PageResponse<PlaceResponse> search(HybridSearchRequest request) {
        normalizeRequest(request);

        String normalizedQuery = SearchNormalizer.normalize(request.getQuery());
        if (normalizedQuery.isBlank()) {
            return PageResponse.<PlaceResponse>builder()
                    .data(List.of())
                    .total(0)
                    .page(request.getPage())
                    .size(request.getSize())
                    .totalPages(0)
                    .build();
        }

        List<String> expandedTerms = searchSynonymService.expand(normalizedQuery);
        List<Double> queryEmbedding = openAiEmbeddingClient.isConfigured()
                ? openAiEmbeddingClient.embedOne(buildEmbeddingText(normalizedQuery, request.getCategory(), request.getDistrict(), expandedTerms))
                : null;

        List<Tuple> rows = hybridSearchRepository.search(
                request,
                normalizedQuery,
                expandedTerms,
                queryEmbedding,
                properties.getCandidateLimit(),
                properties.getKeywordWeight(),
                properties.getVectorWeight(),
                properties.getKeywordThreshold(),
                properties.getVectorThreshold()
        );
        long total = hybridSearchRepository.count(
                request,
                normalizedQuery,
                expandedTerms,
                queryEmbedding,
                properties.getCandidateLimit(),
                properties.getKeywordWeight(),
                properties.getVectorWeight(),
                properties.getKeywordThreshold(),
                properties.getVectorThreshold()
        );

        List<PlaceResponse> data = rows.stream()
                .map(placeMapper::toResponse)
                .toList();

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / request.getSize());

        return PageResponse.<PlaceResponse>builder()
                .data(data)
                .total(total)
                .page(request.getPage())
                .size(request.getSize())
                .totalPages(totalPages)
                .build();
    }

    @Transactional
    public EmbeddingReindexResponse reindexMissingEmbeddings(int requestedLimit) {
        if (!openAiEmbeddingClient.isConfigured()) {
            throw new IllegalStateException("OPENAI_API_KEY is required to reindex embeddings");
        }

        int remaining = requestedLimit <= 0 ? properties.getCandidateLimit() : requestedLimit;
        ReindexCounter counter = new ReindexCounter();

        remaining = reindexTable("places_food", "food", remaining, counter);
        remaining = reindexTable("places_drink", "drink", remaining, counter);
        reindexTable("places_activity", "activity", remaining, counter);

        return EmbeddingReindexResponse.builder()
                .processed(counter.total)
                .food(counter.food)
                .drink(counter.drink)
                .activity(counter.activity)
                .build();
    }

    private int reindexTable(String tableName, String category, int remaining, ReindexCounter counter) {
        while (remaining > 0) {
            int batchSize = Math.min(properties.getReindexBatchSize(), remaining);
            List<HybridSearchRepository.EmbeddingRow> rows =
                    hybridSearchRepository.findRowsMissingEmbeddings(tableName, category, batchSize);
            if (rows.isEmpty()) {
                return remaining;
            }

            List<String> documents = rows.stream()
                    .map(this::buildEmbeddingText)
                    .toList();
            List<List<Double>> embeddings = openAiEmbeddingClient.embedAll(documents);

            for (int i = 0; i < rows.size(); i++) {
                HybridSearchRepository.EmbeddingRow row = rows.get(i);
                hybridSearchRepository.updateEmbedding(
                        tableName,
                        row.id(),
                        SearchNormalizer.normalize(row.name()),
                        toVectorLiteral(embeddings.get(i))
                );
                counter.increment(category);
                remaining--;
            }
        }

        return remaining;
    }

    private void normalizeRequest(HybridSearchRequest request) {
        if (request.getPage() < 0) {
            request.setPage(0);
        }
        if (request.getSize() <= 0 || request.getSize() > 30) {
            request.setSize(10);
        }

        if (request.getCategory() != null && !request.getCategory().isBlank()) {
            String normalizedCategory = request.getCategory().trim().toLowerCase();
            if (!VALID_CATEGORIES.contains(normalizedCategory)) {
                throw new AppException(ErrorCode.INVALID_CATEGORY);
            }
            request.setCategory(normalizedCategory);
        }
    }

    private String buildEmbeddingText(HybridSearchRepository.EmbeddingRow row) {
        return buildEmbeddingText(
                SearchNormalizer.normalize(row.name()),
                row.category(),
                row.district(),
                extractTagTerms(row.tags())
        );
    }

    private String buildEmbeddingText(String normalizedQuery, String category, String district, List<String> expandedTerms) {
        List<String> parts = new ArrayList<>();
        parts.add(normalizedQuery);
        if (category != null && !category.isBlank()) {
            parts.add(category.toLowerCase());
        }
        if (district != null && !district.isBlank()) {
            parts.add(SearchNormalizer.normalize(district));
        }
        parts.addAll(expandedTerms);

        return parts.stream()
                .filter(value -> value != null && !value.isBlank())
                .distinct()
                .reduce((left, right) -> left + "\n" + right)
                .orElse(normalizedQuery);
    }

    private List<String> extractTagTerms(String rawTags) {
        if (rawTags == null || rawTags.isBlank()) {
            return List.of();
        }
        return List.of(SearchNormalizer.normalize(rawTags));
    }

    private String toVectorLiteral(List<Double> embedding) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < embedding.size(); i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(embedding.get(i));
        }
        builder.append(']');
        return builder.toString();
    }

    private static final class ReindexCounter {
        private int total;
        private int food;
        private int drink;
        private int activity;

        private void increment(String category) {
            total++;
            switch (category) {
                case "food" -> food++;
                case "drink" -> drink++;
                case "activity" -> activity++;
                default -> {
                }
            }
        }
    }
}
