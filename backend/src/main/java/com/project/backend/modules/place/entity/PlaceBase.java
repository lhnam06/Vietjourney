package com.project.backend.modules.place.entity;

import io.hypersistence.utils.hibernate.type.range.Range;
import io.hypersistence.utils.hibernate.type.range.PostgreSQLRangeType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.*;
import org.hibernate.type.SqlTypes;
import java.util.*;

@MappedSuperclass
@Data @NoArgsConstructor @AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public abstract class PlaceBase {
    @Id String id;
    String name;

    @Column(columnDefinition = "TEXT")
    String address;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "urls", columnDefinition = "jsonb")
    List<String> images;

    String category;
    Double rating;

    Double latitude;
    Double longitude;
    String district;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    Map<String, List<String>> tags;

    @Type(PostgreSQLRangeType.class)
    @Column(name = "price_range", columnDefinition = "int4range")
    Range<Integer> priceRange;
}