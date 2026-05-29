package com.project.backend.modules.recommendation.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserProfileResponse {
    List<TagPreferenceResponse> tags;
    List<PreferenceResponse> districts;
    List<PreferenceResponse> categories;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class TagPreferenceResponse {
        String tagGroup;
        String tagValue;
        double score;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    @FieldDefaults(level = AccessLevel.PRIVATE)
    public static class PreferenceResponse {
        String value;
        double score;
    }
}
