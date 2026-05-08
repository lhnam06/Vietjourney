package com.project.backend.modules.recommendation.enums;

import lombok.Getter;

@Getter
public enum RecommendationEventType {
    VIEWPORT(1),
    CLICK(2),
    DWELL(4),
    ADD_TO_TIMELINE(6);

    private final int defaultScore;

    RecommendationEventType(int defaultScore) {
        this.defaultScore = defaultScore;
    }
}
