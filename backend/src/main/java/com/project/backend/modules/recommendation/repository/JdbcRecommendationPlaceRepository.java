package com.project.backend.modules.recommendation.repository;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.place.config.PlaceLookupProperties;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

@Slf4j
@Repository
@ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "true")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JdbcRecommendationPlaceRepository implements RecommendationPlaceRepository {
    static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {
    };
    static final TypeReference<Map<String, List<String>>> TAGS_TYPE = new TypeReference<>() {
    };

    Pattern identifierPattern = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
    JdbcTemplate placeJdbcTemplate;
    PlaceLookupProperties placeLookupProperties;
    ObjectMapper objectMapper;

    @Override
    public Optional<RecommendationPlaceCandidate> findByCategoryAndId(String category, String placeId) {
        String table = resolveTableName(category);
        String idColumn = sanitizeIdentifier(placeLookupProperties.getIdColumn(), "id");
        String sql = """
                select
                    %s::text as id,
                    name,
                    address,
                    '%s' as category,
                    district,
                    rating,
                    latitude,
                    longitude,
                    urls::text as images,
                    tags::text as tags,
                    price_range::text as price_range
                from %s
                where %s::text = ?
                """.formatted(idColumn, normalizeCategory(category), table, idColumn);

        return placeJdbcTemplate.query(sql, rowMapper(), placeId).stream().findFirst();
    }

    @Override
    public List<RecommendationPlaceCandidate> findCandidates(int limit) {
        String sql = "select * from (" + buildUnionParts() + ") p order by p.rating desc nulls last limit ?";
        return placeJdbcTemplate.query(sql, rowMapper(), Math.max(1, limit));
    }

    @Override
    public List<RecommendationPlaceCandidate> findCandidates(int limit, Set<String> categories, Set<String> districts) {
        StringBuilder sql = new StringBuilder("select * from (" + buildUnionParts() + ") p where 1=1");
        List<Object> params = new ArrayList<>();

        if (categories != null && !categories.isEmpty()) {
            List<String> normalizedCategories = categories.stream()
                    .map(this::normalizeCategory)
                    .filter(category -> !category.isBlank())
                    .distinct()
                    .toList();
            if (!normalizedCategories.isEmpty()) {
                sql.append(" and p.category in (")
                        .append(placeholders(normalizedCategories.size()))
                        .append(")");
                params.addAll(normalizedCategories);
            }
        }

        if (districts != null && !districts.isEmpty()) {
            List<String> normalizedDistricts = districts.stream()
                    .map(this::normalizeText)
                    .filter(district -> !district.isBlank())
                    .distinct()
                    .toList();
            if (!normalizedDistricts.isEmpty()) {
                sql.append(" and lower(p.district) in (")
                        .append(placeholders(normalizedDistricts.size()))
                        .append(")");
                params.addAll(normalizedDistricts);
            }
        }

        sql.append(" order by p.rating desc nulls last limit ?");
        params.add(Math.max(1, limit));
        return placeJdbcTemplate.query(sql.toString(), rowMapper(), params.toArray());
    }

    @Override
    public List<RecommendationPlaceCandidate> findRandom(int limit) {
        String sql = "select * from (" + buildUnionParts() + ") p order by random() limit ?";
        return placeJdbcTemplate.query(sql, rowMapper(), Math.max(1, limit));
    }

    private String buildUnionParts() {
        List<String> parts = new ArrayList<>();
        parts.add(unionPart(sanitizeIdentifier(placeLookupProperties.getFoodTable(), "places_food"), "food"));
        parts.add(unionPart(sanitizeIdentifier(placeLookupProperties.getDrinkTable(), "places_drink"), "drink"));
        parts.add(unionPart(sanitizeIdentifier(placeLookupProperties.getActivityTable(), "places_activity"), "activity"));
        return String.join(" union all ", parts);
    }

    private String unionPart(String table, String category) {
        String idColumn = sanitizeIdentifier(placeLookupProperties.getIdColumn(), "id");
        return """
                select
                    %s::text as id,
                    name,
                    address,
                    '%s' as category,
                    district,
                    rating,
                    latitude,
                    longitude,
                    urls::text as images,
                    tags::text as tags,
                    price_range::text as price_range
                from %s
                """.formatted(idColumn, category, table);
    }

    private RowMapper<RecommendationPlaceCandidate> rowMapper() {
        return this::mapCandidate;
    }

    private RecommendationPlaceCandidate mapCandidate(ResultSet rs, int rowNum) throws SQLException {
        String priceRange = rs.getString("price_range");
        return RecommendationPlaceCandidate.builder()
                .id(rs.getString("id"))
                .name(rs.getString("name"))
                .address(rs.getString("address"))
                .category(rs.getString("category"))
                .district(rs.getString("district"))
                .rating(getDouble(rs, "rating"))
                .latitude(getDouble(rs, "latitude"))
                .longitude(getDouble(rs, "longitude"))
                .images(parseJson(rs.getString("images"), LIST_TYPE))
                .tags(parseJson(rs.getString("tags"), TAGS_TYPE))
                .minPrice(parsePriceRangeLower(priceRange))
                .maxPrice(parsePriceRangeUpper(priceRange))
                .build();
    }

    private String resolveTableName(String category) {
        return switch (normalizeCategory(category)) {
            case "food" -> sanitizeIdentifier(placeLookupProperties.getFoodTable(), "places_food");
            case "drink" -> sanitizeIdentifier(placeLookupProperties.getDrinkTable(), "places_drink");
            case "activity" -> sanitizeIdentifier(placeLookupProperties.getActivityTable(), "places_activity");
            default -> throw new IllegalArgumentException("Invalid category: " + category);
        };
    }

    private String normalizeCategory(String category) {
        return category == null ? "" : category.trim().toLowerCase();
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private String placeholders(int count) {
        return String.join(",", java.util.Collections.nCopies(Math.max(1, count), "?"));
    }

    private String sanitizeIdentifier(String value, String fallback) {
        if (value == null || !identifierPattern.matcher(value).matches()) {
            return fallback;
        }
        return value;
    }

    private Double getDouble(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).doubleValue();
    }

    private <T> T parseJson(String raw, TypeReference<T> typeRef) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readValue(raw, typeRef);
        } catch (Exception e) {
            log.warn("Failed to parse place JSON: {}", raw, e);
            return null;
        }
    }

    private Integer parsePriceRangeLower(String range) {
        if (range == null) return null;
        try {
            String[] parts = range.replaceAll("[\\[\\]()+]", "").split(",");
            return parts.length >= 1 && !parts[0].isBlank() ? Integer.parseInt(parts[0].trim()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private Integer parsePriceRangeUpper(String range) {
        if (range == null) return null;
        try {
            String[] parts = range.replaceAll("[\\[\\]()+]", "").split(",");
            return parts.length >= 2 && !parts[1].isBlank() ? Integer.parseInt(parts[1].trim()) : null;
        } catch (Exception e) {
            return null;
        }
    }
}
