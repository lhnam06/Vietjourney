package com.project.backend.modules.search.dto.request;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class HybridSearchRequest {
    String query;
    String category;
    String district;

    @Builder.Default
    int page = 0;

    @Builder.Default
    int size = 10;
}
