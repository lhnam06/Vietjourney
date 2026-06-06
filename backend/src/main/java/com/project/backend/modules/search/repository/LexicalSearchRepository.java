package com.project.backend.modules.search.repository;

import com.project.backend.modules.search.dto.request.LexicalSearchRequest;
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
public class LexicalSearchRepository {
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
              normalized_name
            FROM %s
            """;

    private static final Map<String, String> TABLE_MAP = Map.of(
            "food", "places_food",
            "drink", "places_drink",
            "activity", "places_activity"
    );

    private final EntityManager entityManager;

    public List<Tuple> search(
            LexicalSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            double keywordThreshold
    ) {
        QueryParts queryParts = buildSearchQuery(request, normalizedQuery, expandedTerms, keywordThreshold, false);
        Query query = entityManager.createNativeQuery(queryParts.sql(), Tuple.class);
        queryParts.params().forEach(query::setParameter);
        query.setParameter("limit", request.getSize());
        query.setParameter("offset", request.getPage() * request.getSize());
        return query.getResultList();
    }

    public long count(
            LexicalSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            double keywordThreshold
    ) {
        QueryParts queryParts = buildSearchQuery(request, normalizedQuery, expandedTerms, keywordThreshold, true);
        Query query = entityManager.createNativeQuery(queryParts.sql());
        queryParts.params().forEach(query::setParameter);
        return ((Number) query.getSingleResult()).longValue();
    }

    private QueryParts buildSearchQuery(
            LexicalSearchRequest request,
            String normalizedQuery,
            List<String> expandedTerms,
            double keywordThreshold,
            boolean countOnly
    ) {
        Map<String, Object> params = new LinkedHashMap<>();
        params.put("normalizedQuery", normalizedQuery);
        params.put("prefixQuery", normalizedQuery + "%");
        params.put("containsQuery", "%" + normalizedQuery + "%");
        params.put("ftsQuery", normalizedQuery);
        params.put("keywordThreshold", keywordThreshold);
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
                        CASE WHEN COALESCE(p.normalized_name, '') = :normalizedQuery THEN 1.0 ELSE 0 END,
                        CASE WHEN COALESCE(p.normalized_name, '') LIKE :prefixQuery THEN 0.94 ELSE 0 END,
                        CASE WHEN COALESCE(p.normalized_name, '') LIKE :containsQuery THEN 0.78 ELSE 0 END,
                        COALESCE(similarity(COALESCE(p.normalized_name, ''), :normalizedQuery), 0) * 0.92,
                        COALESCE(word_similarity(:normalizedQuery, COALESCE(p.normalized_name, '')), 0) * 0.84,
                        COALESCE(ts_rank_cd(to_tsvector('simple', %s), websearch_to_tsquery('simple', :ftsQuery)), 0) * 0.5,
                        CASE WHEN %s THEN 0.72 ELSE 0 END
                    )
                )
                """.formatted(documentExpression, synonymCondition);

        String preFilterCondition;
        if (expandedTerms != null && !expandedTerms.isEmpty()) {
            String fastSynonymCondition = buildFastSynonymConditionForPreFilter(expandedTerms, "p");
            preFilterCondition = " AND (p.normalized_name % :normalizedQuery OR p.normalized_name LIKE :containsQuery OR " + fastSynonymCondition + ") ";
        } else {
            preFilterCondition = " AND (p.normalized_name % :normalizedQuery OR p.normalized_name LIKE :containsQuery) ";
        }

        String commonFrom = """
                FROM (
                    %s
                ) p
                WHERE 1 = 1
                %s
                %s
                """.formatted(buildUnionParts(request.getCategory()), preFilterCondition, buildOptionalFilterClause(request));

        if (countOnly) {
            String countQuery = """
                    SELECT COUNT(*)
                    FROM (
                        SELECT p.id
                        %s
                        AND %s >= :keywordThreshold
                    ) ranked
                    """.formatted(commonFrom, keywordScoreExpression);
            return new QueryParts(countQuery, params);
        }

        String searchQuery = """
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
                           %s AS keyword_score
                    %s
                ) ranked
                WHERE ranked.keyword_score >= :keywordThreshold
                ORDER BY ranked.keyword_score DESC, ranked.rating DESC NULLS LAST, ranked.name ASC
                LIMIT :limit OFFSET :offset
                """.formatted(keywordScoreExpression, commonFrom);

        return new QueryParts(searchQuery, params);
    }

    private String buildOptionalFilterClause(LexicalSearchRequest request) {
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
                    COALESCE(%s.normalized_name, '') LIKE :%s
                    OR lower(%s.category) LIKE :%s
                    OR lower(%s.district) LIKE :%s
                    OR regexp_replace(COALESCE(lower(%s.tags), ''), '[^a-z0-9\\s]', ' ', 'g') LIKE :%s
                    """.formatted(alias, paramName, alias, paramName, alias, paramName, alias, paramName));
        }

        return "(" + String.join(" OR ", clauses) + ")";
    }

    private String buildFastSynonymConditionForPreFilter(List<String> expandedTerms, String alias) {
        if (expandedTerms == null || expandedTerms.isEmpty()) {
            return "FALSE";
        }

        List<String> clauses = new ArrayList<>();
        for (int i = 0; i < expandedTerms.size(); i++) {
            String paramName = "term" + i;
            clauses.add("COALESCE(%s.normalized_name, '') LIKE :%s".formatted(alias, paramName));
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

    private record QueryParts(String sql, Map<String, Object> params) {
    }
}
