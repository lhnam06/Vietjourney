package com.project.backend.modules.place.service;

import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.place.config.PlaceLookupProperties;
import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Optional;
import java.util.regex.Pattern;

@Service
@ConditionalOnBean(JdbcTemplate.class)
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class JdbcPlaceLookupService implements PlaceLookupService {
    Pattern identifierPattern = Pattern.compile("[A-Za-z_][A-Za-z0-9_]*");
    RowMapper<PlaceSummary> placeSummaryRowMapper = this::mapPlaceSummary;

    JdbcTemplate placeJdbcTemplate;
    PlaceLookupProperties placeLookupProperties;

    @Override
    public void assertPlaceExists(TimelineEventCategory category, String externalPlaceId) {
        String tableName = resolveTableName(category);
        String idColumn = sanitizeIdentifier(placeLookupProperties.getIdColumn(), "id");
        String sql = "select exists(select 1 from " + tableName + " where " + idColumn + "::text = ?)";

        Boolean exists = placeJdbcTemplate.queryForObject(sql, Boolean.class, externalPlaceId);
        if (!Boolean.TRUE.equals(exists)) {
            throw new AppException(ErrorCode.PLACE_NOT_EXIST);
        }
    }

    @Override
    public Optional<PlaceSummary> findPlace(TimelineEventCategory category, String externalPlaceId) {
        String tableName = resolveTableName(category);
        String idColumn = sanitizeIdentifier(placeLookupProperties.getIdColumn(), "id");
        String sql = """
                select
                    %s::text as id,
                    name,
                    address,
                    rating,
                    latitude,
                    longitude,
                    district,
                    urls
                from %s
                where %s::text = ?
                """.formatted(idColumn, tableName, idColumn);

        return placeJdbcTemplate.query(sql, placeSummaryRowMapper, externalPlaceId).stream().findFirst();
    }

    private String resolveTableName(TimelineEventCategory category) {
        return switch (category) {
            case FOOD -> sanitizeIdentifier(placeLookupProperties.getFoodTable(), "places_food");
            case DRINK -> sanitizeIdentifier(placeLookupProperties.getDrinkTable(), "places_drink");
            case ACTIVITY -> sanitizeIdentifier(placeLookupProperties.getActivityTable(), "places_activity");
        };
    }

    private String sanitizeIdentifier(String value, String fallback) {
        if (value == null || !identifierPattern.matcher(value).matches()) {
            return fallback;
        }
        return value;
    }

    private PlaceSummary mapPlaceSummary(ResultSet rs, int rowNum) throws SQLException {
        return PlaceSummary.builder()
                .id(rs.getString("id"))
                .name(rs.getString("name"))
                .address(rs.getString("address"))
                .rating(rs.getBigDecimal("rating"))
                .latitude((Double) rs.getObject("latitude"))
                .longitude((Double) rs.getObject("longitude"))
                .district(rs.getString("district"))
                .imageUrl(extractFirstUrl(rs.getString("urls")))
                .build();
    }

    private String extractFirstUrl(String rawJson) {
        if (rawJson == null || rawJson.isBlank()) {
            return null;
        }

        int firstQuote = rawJson.indexOf('"');
        int secondQuote = firstQuote < 0 ? -1 : rawJson.indexOf('"', firstQuote + 1);
        if (firstQuote < 0 || secondQuote < 0) {
            return null;
        }
        return rawJson.substring(firstQuote + 1, secondQuote);
    }
}
