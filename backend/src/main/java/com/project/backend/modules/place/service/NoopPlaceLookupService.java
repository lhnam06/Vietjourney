package com.project.backend.modules.place.service;

import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@ConditionalOnProperty(prefix = "place.datasource", name = "enabled", havingValue = "false", matchIfMissing = true)
public class NoopPlaceLookupService implements PlaceLookupService {
    @Override
    public void assertPlaceExists(TimelineEventCategory category, String externalPlaceId) {
        // Place DB is optional in local development.
    }

    @Override
    public Optional<PlaceSummary> findPlace(TimelineEventCategory category, String externalPlaceId) {
        return Optional.empty();
    }
}
