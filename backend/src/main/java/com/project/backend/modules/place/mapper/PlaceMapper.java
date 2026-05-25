package com.project.backend.modules.place.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.backend.modules.place.dto.response.PlaceResponse;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class PlaceMapper {

    private static final TypeReference<List<String>> LIST_TYPE = new TypeReference<>() {
    };
    private static final TypeReference<Map<String, List<String>>> TAGS_TYPE = new TypeReference<>() {
    };
    private final ObjectMapper objectMapper;

    public PlaceResponse toResponse(Tuple tuple) {
        return PlaceResponse.builder()
                .id(getString(tuple, "id"))
                .name(get(tuple, "name", String.class))
                .address(get(tuple, "address", String.class))
                .category(get(tuple, "category", String.class))
                .district(get(tuple, "district", String.class))
                .rating(getDouble(tuple, "rating"))
                .latitude(getDouble(tuple, "latitude"))
                .longitude(getDouble(tuple, "longitude"))
                .images(parseImages(get(tuple, "images", String.class)))
                .tags(parseTags(get(tuple, "tags", String.class)))
                .minPrice(parsePriceRangeLower(get(tuple, "price_range", String.class)))
                .maxPrice(parsePriceRangeUpper(get(tuple, "price_range", String.class)))
                .build();
    }

    private String getString(Tuple tuple, String alias) {
        try {
            Object val = tuple.get(alias);
            return val != null ? val.toString() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private <T> T get(Tuple tuple, String alias, Class<T> type) {
        try {
            return tuple.get(alias, type);
        } catch (Exception e) {
            return null;
        }
    }

    private Double getDouble(Tuple tuple, String alias) {
        try {
            Object val = tuple.get(alias);
            return val != null ? ((Number) val).doubleValue() : null;
        } catch (Exception e) {
            return null;
        }
    }


    // Parse Json to Java Object
    private <T> T parseJson(String raw, TypeReference<T> typeRef) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readValue(raw, typeRef);
        } catch (Exception e) {
            log.warn("Failed to parse JSON: {} - {}", raw, e.getMessage());
            return null;
        }
    }

    // Parse Tags, handling both Map and fallback to List
    private Map<String, List<String>> parseTags(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readValue(raw, TAGS_TYPE);
        } catch (Exception e) {
            try {
                List<String> list = objectMapper.readValue(raw, LIST_TYPE);
                return Map.of("general", list);
            } catch (Exception ex) {
                log.warn("Failed to parse tags JSON: {} - {}", raw, ex.getMessage());
                return null;
            }
        }
    }

    // Parse Images, handling both List and fallback to single String
    private List<String> parseImages(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return objectMapper.readValue(raw, LIST_TYPE);
        } catch (Exception e) {
            try {
                // If it fails to parse as a List, check if it's a single string
                String stripped = raw.replaceAll("^\"|\"$", "");
                return List.of(stripped);
            } catch (Exception ex) {
                log.warn("Failed to parse images JSON: {} - {}", raw, ex.getMessage());
                return null;
            }
        }
    }

    // Parse Int4range to Int (Lower)
    private Integer parsePriceRangeLower(String range) {
        if (range == null) return null;
        try {
            String removedSpecial = range.replaceAll("[\\[\\]()+]", "");
            String[] parts = removedSpecial.split(",");
            return parts.length >= 1 && !parts[0].isBlank()
                    ? Integer.parseInt(parts[0].trim()) : null;
        } catch (Exception e) {
            return null;
        }
    }

    // Parse Int4range to Int (Upper)
    private Integer parsePriceRangeUpper(String range) {
        if (range == null) return null;
        try {
            String removedSpecial = range.replaceAll("[\\[\\]()+]", "");
            String[] parts = removedSpecial.split(",");
            return parts.length >= 2 && !parts[1].isBlank()
                    ? Integer.parseInt(parts[1].trim()) : null;
        } catch (Exception e) {
            return null;
        }
    }
}