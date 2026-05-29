package com.project.backend.modules.search.repository;

import com.project.backend.modules.search.dto.request.HybridSearchRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Repository
@RequiredArgsConstructor
public class HybridSearchRepository {
    private static final String UNION_SELECT_TEMPLATE = """
            SELECT
              id,
              name,
              address,
              '%s' AS category,
              district,
              rating,
              latitude,
              longitude,
              CAST(urls AS text) AS images,
              CAST(tags AS text) AS tags,
              CAST(price_range AS text) AS price_range,
              normalized_name,
              search_embedding
            FROM %s
            """;

    private static final Map<String, String> TABLE_MAP = Map.of(
            "food", "places_food",
            "drink", "places_drink",
            "activity", "places_activity"
    );

    private final EntityManager entityManager;

    public List<Tuple> search(
            HybridSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            List<Double> queryEmbedding,
            int candidateLimit,
            double keywordWeight,
            double vectorWeight,
            double keywordThreshold,
            double vectorThreshold
    ) {
        QueryParts queryParts = buildSearchQuery(
                request,
                normalizedQuery,
                expandedTerms,
                queryEmbedding,
                candidateLimit,
                keywordWeight,
                vectorWeight,
                keywordThreshold,
                vectorThreshold,
                false
        );

        Query query = entityManager.createNativeQuery(queryParts.sql(), Tuple.class);
        queryParts.params().forEach(query::setParameter);
        query.setParameter("limit", request.getSize());
        query.setParameter("offset", request.getPage() * request.getSize());
        return query.getResultList();
    }

    public long count(
            HybridSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            List<Double> queryEmbedding,
            int candidateLimit,
            double keywordWeight,
            double vectorWeight,
            double keywordThreshold,
            double vectorThreshold
    ) {
        QueryParts queryParts = buildSearchQuery(
                request,
                normalizedQuery,
                expandedTerms,
                queryEmbedding,
                candidateLimit,
                keywordWeight,
                vectorWeight,
                keywordThreshold,
                vectorThreshold,
                true
        );

        Query query = entityManager.createNativeQuery(queryParts.sql());
        queryParts.params().forEach(query::setParameter);
        return ((Number) query.getSingleResult()).longValue();
    }

    public List<EmbeddingRow> findRowsMissingEmbeddings(String tableName, String category, int limit) {
        String sql = """
                SELECT
                    id,
                    name,
                    address,
                    district,
                    CAST(tags AS text) AS tags
                FROM %s
                WHERE search_embedding IS NULL
                ORDER BY rating DESC NULLS LAST, name ASC
                LIMIT :limit
                """.formatted(tableName);

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("limit", limit)
                .getResultList();

        List<EmbeddingRow> results = new ArrayList<>();
        for (Object[] row : rows) {
            results.add(new EmbeddingRow(
                    toStringValue(row[0]),
                    toStringValue(row[1]),
                    toStringValue(row[2]),
                    category,
                    toStringValue(row[3]),
                    toStringValue(row[4])
            ));
        }
        return results;
    }

    public void updateEmbedding(String tableName, String id, String normalizedName, String vectorLiteral) {
        String sql = """
                UPDATE %s
                SET normalized_name = :normalizedName,
                    search_embedding = CAST(:embedding AS vector)
                WHERE id = :id
                """.formatted(tableName);

        entityManager.createNativeQuery(sql)
                .setParameter("normalizedName", normalizedName)
                .setParameter("embedding", vectorLiteral)
                .setParameter("id", id)
                .executeUpdate();
    }

    private QueryParts buildSearchQuery(
            HybridSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            List<Double> queryEmbedding,
            int candidateLimit,
            double keywordWeight,
            double vectorWeight,
            double keywordThreshold,
            double vectorThreshold,
            boolean countOnly
    ) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("normalizedQuery", normalizedQuery);
        params.put("prefixQuery", normalizedQuery + "%");
        params.put("containsQuery", "%" + normalizedQuery + "%");
        params.put("ftsQuery", normalizedQuery);
        params.put("keywordThreshold", keywordThreshold);
        params.put("vectorThreshold", vectorThreshold);
        if (request.getDistrict() != null && !request.getDistrict().isBlank()) {
            params.put("district", request.getDistrict().trim().toLowerCase());
        }

        String synonymCondition = buildSynonymCondition(expandedTerms, params, "p");
        String documentExpression = """
                (
                    COALESCE(p.normalized_name, '') || ' ' ||
                    COALESCE(lower(p.category), '') || ' ' ||
                    COALESCE(lower(p.district), '') || ' ' ||
                    regexp_replace(COALESCE(lower(p.tags), ''), '[^a-z0-9\\s]', ' ', 'g')
                )
                """;
        String keywordScoreExpression = """
                LEAST(1.0,
                    GREATEST(
                        CASE WHEN p.normalized_name = :normalizedQuery THEN 1.0 ELSE 0 END,
                        CASE WHEN p.normalized_name LIKE :prefixQuery THEN 0.92 ELSE 0 END,
                        CASE WHEN p.normalized_name LIKE :containsQuery THEN 0.75 ELSE 0 END,
                        COALESCE(similarity(p.normalized_name, :normalizedQuery), 0) * 0.88,
                        COALESCE(ts_rank_cd(to_tsvector('simple', %s), websearch_to_tsquery('simple', :ftsQuery)), 0) * 0.5,
                        CASE WHEN %s THEN 0.72 ELSE 0 END
                    )
                )
                """.formatted(documentExpression, synonymCondition);

        boolean hasVectorQuery = queryEmbedding != null && !queryEmbedding.isEmpty();
        String vectorScoreExpression = "0.0";
        if (hasVectorQuery) {
            params.put("queryEmbedding", toVectorLiteral(queryEmbedding));
            vectorScoreExpression = """
                    CASE
                        WHEN p.search_embedding IS NULL THEN 0.0
                        ELSE GREATEST(0.0, 1 - (p.search_embedding <=> CAST(:queryEmbedding AS vector)))
                    END
                    """;
        }

        String baseQuery = """
                SELECT ranked.id,
                       ranked.name,
                       ranked.address,
                       ranked.category,
                       ranked.district,
                       ranked.rating,
                       ranked.latitude,
                       ranked.longitude,
                       ranked.images,
                       ranked.tags,
                       ranked.price_range
                FROM (
                    SELECT p.*,
                           %s AS keyword_score,
                           %s AS vector_score,
                           ((%s * %s) + (%s * %s)) AS hybrid_score
                    FROM (
                        %s
                    ) p
                    WHERE 1 = 1
                    %s
                ) ranked
                WHERE ranked.keyword_score >= :keywordThreshold
                   OR ranked.vector_score >= :vectorThreshold
                ORDER BY ranked.hybrid_score DESC, ranked.keyword_score DESC, ranked.rating DESC NULLS LAST
                LIMIT :limit OFFSET :offset
                """.formatted(
                keywordScoreExpression,
                vectorScoreExpression,
                keywordScoreExpression,
                keywordWeight,
                vectorScoreExpression,
                vectorWeight,
                buildUnionParts(request.getCategory()),
                buildOptionalFilterClause(request)
        );

        String countQuery = """
                SELECT COUNT(*)
                FROM (
                    SELECT p.id
                    FROM (
                        %s
                    ) p
                    WHERE 1 = 1
                    %s
                    AND (
                        %s >= :keywordThreshold
                        OR %s >= :vectorThreshold
                    )
                    ORDER BY (
                        (%s * %s) + (%s * %s)
                    ) DESC
                ) ranked
                """.formatted(
                buildUnionParts(request.getCategory()),
                buildOptionalFilterClause(request),
                keywordScoreExpression,
                vectorScoreExpression,
                keywordScoreExpression,
                keywordWeight,
                vectorScoreExpression,
                vectorWeight
        );

        if (countOnly) {
            return new QueryParts(countQuery, params);
        }

        return new QueryParts(baseQuery, params);
    }

    private String buildOptionalFilterClause(HybridSearchRequest request) {
        StringBuilder clause = new StringBuilder();
        if (request.getDistrict() != null && !request.getDistrict().isBlank()) {
            clause.append(" AND lower(p.district) = :district ");
        }
        return clause.toString();
    }

    private String buildSynonymCondition(List<String> expandedTerms, Map<String, Object> params, String alias) {
        if (expandedTerms == null || expandedTerms.isEmpty()) {
            return "FALSE";
        }

        List<String> clauses = new ArrayList<>();
        for (int i = 0; i < expandedTerms.size(); i++) {
            String paramName = "term" + i;
            params.put(paramName, "%" + expandedTerms.get(i) + "%");
            clauses.add("""
                    %s.normalized_name LIKE :%s
                    OR lower(%s.category) LIKE :%s
                    OR lower(%s.district) LIKE :%s
                    OR regexp_replace(COALESCE(lower(%s.tags), ''), '[^a-z0-9\\s]', ' ', 'g') LIKE :%s
                    """.formatted(alias, paramName, alias, paramName, alias, paramName, alias, paramName));
        }

        return "(" + String.join(" OR ", clauses) + ")";
    }

    private String buildUnionParts(String category) {
        List<String> tables = resolveTables(category);
        List<String> parts = new ArrayList<>();
        for (String table : tables) {
            String categoryName = switch (table) {
                case "places_food" -> "food";
                case "places_drink" -> "drink";
                default -> "activity";
            };
            parts.add(UNION_SELECT_TEMPLATE.formatted(categoryName, table));
        }
        return String.join(" UNION ALL ", parts);
    }

    private List<String> resolveTables(String category) {
        if (category == null || category.isBlank()) {
            return List.of("places_food", "places_drink", "places_activity");
        }

        String tableName = TABLE_MAP.get(category.trim().toLowerCase());
        if (tableName == null) {
            throw new IllegalArgumentException("Invalid category: " + category);
        }
        return List.of(tableName);
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

    private String toStringValue(Object value) {
        return value == null ? null : value.toString();
    }

    public record EmbeddingRow(
            String id,
            String name,
            String address,
            String category,
            String district,
            String tags
    ) {
    }

    private record QueryParts(String sql, Map<String, Object> params) {
    }
}
