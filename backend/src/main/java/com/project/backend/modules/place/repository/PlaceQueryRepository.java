package com.project.backend.modules.place.repository;

import com.project.backend.modules.place.dto.request.PlaceFilterRequest;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.*;

@Repository
@RequiredArgsConstructor
public class PlaceQueryRepository {

    // Cast jsonb/int4range to text
    private static final String UNION_SELECT_TEMPLATE = """
            SELECT
              id,
              name,
              address,
              category,
              district,
              rating,
              latitude,
              longitude,
              CAST(urls AS text) AS images,
              CAST(tags AS text) AS tags,
              CAST(price_range AS text) AS price_range
            FROM %s
            """;
    private static final Map<String, String> TABLE_MAP = Map.of(
            "food", "places_food",
            "drink", "places_drink",
            "activity", "places_activity"
    );

    // Whitelist
    private static final Set<String> ALLOWED_TAG_GROUPS = Set.of(
            "sub_category", "purpose", "service_style",
            "vibe", "amenity"
    );

    private final EntityManager em;
    public List<Tuple> findByFilter(PlaceFilterRequest req) {
        WhereClause whereClause = buildWhere(req);

        String sql = new StringBuilder()
                .append(buildFromClause(req.getCategory()))
                .append(whereClause.sql())
                .append(" ORDER BY p.rating DESC NULLS LAST")
                .append(" LIMIT :limit OFFSET :offset")
                .toString();

        Query query = em.createNativeQuery(sql, Tuple.class);
        whereClause.params().forEach(query::setParameter);
        query.setParameter("limit", req.getSize());
        query.setParameter("offset", req.getPage() * req.getSize());

        return query.getResultList();
    }

    public long countByFilter(PlaceFilterRequest req) {
        WhereClause whereClause = buildWhere(req);

        String sql = "SELECT COUNT(*) FROM ("
                + buildUnionParts(req.getCategory())
                + ") p"
                + whereClause.sql();

        Query query = em.createNativeQuery(sql);
        whereClause.params().forEach(query::setParameter);

        return ((Number) query.getSingleResult()).longValue();
    }

    private WhereClause buildWhere(PlaceFilterRequest req) {
        StringBuilder sql = new StringBuilder(" WHERE 1=1 ");
        Map<String, Object> params = new LinkedHashMap<>();

        // district
        if (hasValue(req.getDistrict())) {
            sql.append(" AND LOWER(p.district) = LOWER(:district) ");
            params.put("district", req.getDistrict().trim());
        }

        // rating
        if (req.getMinRating() != null) {
            sql.append(" AND p.rating >= :minRating ");
            params.put("minRating", req.getMinRating());
        }

        // price range overlap
        if (req.getMinPrice() != null || req.getMaxPrice() != null) {
            Integer minPrice = req.getMinPrice();
            Integer maxPrice = req.getMaxPrice();
            if (minPrice != null && maxPrice != null) {
                sql.append(" AND CAST(p.price_range AS int4range) && int4range(:minPrice, :maxPrice, '[]') ");
                params.put("minPrice", minPrice);
                params.put("maxPrice", maxPrice);
            } else if (minPrice != null) {
                sql.append(" AND CAST(p.price_range AS int4range) && int4range(:minPrice, NULL, '[)') ");
                params.put("minPrice", minPrice);
            } else {
                sql.append(" AND CAST(p.price_range AS int4range) && int4range(NULL, :maxPrice, '(]') ");
                params.put("maxPrice", maxPrice);
            }
        }

        // tags: AND across groups, OR within a group
        if (req.getTags() != null) {
            int i = 0;
            for (Map.Entry<String, List<String>> entry : req.getTags().entrySet()) {
                String group = entry.getKey();
                List<String> values = entry.getValue();

                if (!ALLOWED_TAG_GROUPS.contains(group)) continue;
                if (values == null || values.isEmpty()) continue;

                String paramName = "tagVals" + i;
                sql.append(" AND jsonb_exists_any(CAST(p.tags AS jsonb)->'").append(group)
                        .append("', CAST(:").append(paramName).append(" AS text[])) ");
                params.put(paramName, values.toArray(new String[0]));
                i++;
            }
        }

        return new WhereClause(sql.toString(), params);
    }

    private String buildFromClause(String category) {
        return "SELECT * FROM (" + buildUnionParts(category) + ") p";
    }

    private String buildUnionParts(String category) {
        List<String> tables = resolveTables(category);
        List<String> parts = new ArrayList<>();
        for (String table : tables) {
            parts.add(UNION_SELECT_TEMPLATE.formatted(table));
        }
        return String.join(" UNION ALL ", parts);
    }

    private List<String> resolveTables(String category) {
        if (category == null || category.isBlank()) {
            return List.of("places_food", "places_drink", "places_activity");
        }
        String table = TABLE_MAP.get(category.toLowerCase().trim());
        if (table == null) {
            throw new IllegalArgumentException("Invalid category: " + category);
        }
        return List.of(table);
    }

    private boolean hasValue(String s) {
        return s != null && !s.isBlank();
    }

    private record WhereClause(String sql, Map<String, Object> params) {
    }
}
