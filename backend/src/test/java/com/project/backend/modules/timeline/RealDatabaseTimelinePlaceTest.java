package com.project.backend.modules.timeline;

import com.project.backend.modules.place.dto.PlaceSummary;
import com.project.backend.modules.place.service.PlaceLookupService;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.repository.TimelineEventRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;
import java.util.Optional;

@SpringBootTest
// Intentionally NOT using @ActiveProfiles("test") so it connects to the real DB in application.yml
public class RealDatabaseTimelinePlaceTest {

    @Autowired
    TimelineEventRepository timelineEventRepository;

    @Autowired
    PlaceLookupService placeLookupService;

    @Test
    void testRetrievePlaceDataForTimelineEvents() {
        String tripId = "3f973731-fe01-4a12-b8c2-3d76793505cd";
        System.out.println("=========================================================================");
        System.out.println("Fetching Timeline Events for Trip ID: " + tripId);
        
        List<TimelineEvent> events = timelineEventRepository.findTimelineEventsInRange(tripId, java.time.LocalDateTime.of(1970, 1, 1, 0, 0), java.time.LocalDateTime.of(2999, 1, 1, 0, 0));
        
        if (events.isEmpty()) {
            System.out.println("No events found for this Trip ID. Are you sure it exists in the database?");
            System.out.println("=========================================================================");
            return;
        }

        System.out.println("Found " + events.size() + " events. Checking Place database matching...");
        
        for (TimelineEvent event : events) {
            System.out.println("\nEvent ID: " + event.getId());
            System.out.println("Category: " + event.getCategory());
            System.out.println("ExternalPlaceId: " + event.getExternalPlaceId());
            System.out.println("Time: " + event.getStartTime() + " - " + event.getEndTime());

            if (event.getExternalPlaceId() != null && !event.getExternalPlaceId().isEmpty()) {
                Optional<PlaceSummary> placeOpt = placeLookupService.findPlace(event.getCategory(), event.getExternalPlaceId());
                if (placeOpt.isPresent()) {
                    PlaceSummary place = placeOpt.get();
                    System.out.println("✅ MATCH FOUND IN PLACES DB!");
                    System.out.println("   Place Name: " + place.getName());
                    System.out.println("   Address: " + place.getAddress());
                    System.out.println("   Rating: " + place.getRating());
                    System.out.println("   Coordinates: (" + place.getLatitude() + ", " + place.getLongitude() + ")");
                } else {
                    System.out.println("❌ NO MATCH FOUND in Places DB for category " + event.getCategory() + " and ID " + event.getExternalPlaceId());
                }
            } else {
                System.out.println("⚠️ No externalPlaceId provided for this event (Custom Event).");
            }
        }
        System.out.println("=========================================================================");
    }
}
