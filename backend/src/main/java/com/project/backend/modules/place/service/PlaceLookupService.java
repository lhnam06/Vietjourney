package com.project.backend.modules.place.service;

import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;

import java.util.Optional;

public interface PlaceLookupService {
    void assertPlaceExists(TimelineEventCategory category, String externalPlaceId);

    Optional<PlaceSummary> findPlace(TimelineEventCategory category, String externalPlaceId);
}
