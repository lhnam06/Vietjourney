package com.project.backend.modules.place.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class PlaceSummary {
    String id;
    String name;
    String address;
    BigDecimal rating;
    Double latitude;
    Double longitude;
    String district;
    String imageUrl;
}
