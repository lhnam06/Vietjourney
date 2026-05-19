package com.project.backend.modules.timeline;

import com.project.backend.modules.timeline.entity.Timeline;
import com.project.backend.modules.timeline.entity.TimelineEvent;
import com.project.backend.modules.timeline.repository.TimelineRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

@SpringBootTest
@ActiveProfiles("test")
@jakarta.transaction.Transactional
public class TimelineDataStructureTests {

    @Autowired
    TimelineRepository timelineRepository;

    @Autowired
    com.project.backend.modules.timeline.repository.TimelineEventRepository timelineEventRepository;

    @Autowired
    com.project.backend.modules.auth.repository.UserRepository userRepository;

    @Test
    void inspectTimelineAndEvents() {
        String tripId = "3f973731-fe01-4a12-b8c2-3d76793505cd";
        System.out.println("\n=== FETCHING TIMELINE FOR TRIP ID: " + tripId + " ===");
        
        Optional<Timeline> timelineOpt = timelineRepository.findById(tripId);
        
        if (timelineOpt.isEmpty()) {
            System.out.println("[INFO] ID " + tripId + " not found. Creating inspection data...");
            com.project.backend.modules.auth.entity.User owner = userRepository.save(com.project.backend.modules.auth.entity.User.builder()
                    .username("testuser")
                    .password("pass")
                    .displayName("Test User")
                    .build());

            Timeline newTimeline = Timeline.builder()
                    .title("Mock Trip")
                    .description("Structural Test")
                    .startDate(java.time.LocalDate.now())
                    .endDate(java.time.LocalDate.now().plusDays(3))
                    .visibility(com.project.backend.modules.timeline.enums.TimelineVisibility.PRIVATE)
                    .owner(owner)
                    .build();
            
            Timeline saved = timelineRepository.saveAndFlush(newTimeline);

            TimelineEvent event = TimelineEvent.builder()
                    .timeline(saved)
                    .externalPlaceId("place-123")
                    .category(com.project.backend.modules.timeline.enums.TimelineEventCategory.ACTIVITY)
                    .startTime(java.time.LocalDateTime.now())
                    .endTime(java.time.LocalDateTime.now().plusHours(2))
                    .orderIndex(0)
                    .notes("Sample note")
                    .status(com.project.backend.modules.timeline.enums.TimelineEventStatus.PLANNED)
                    .build();
            
            timelineEventRepository.saveAndFlush(event);
            
            timelineOpt = Optional.of(saved);
        }

        if (timelineOpt.isPresent()) {
            Timeline timeline = timelineOpt.get();
            System.out.println("\n--- TIMELINE OBJECT STRUCTURE ---");
            System.out.println("ID: " + timeline.getId());
            System.out.println("Title: " + timeline.getTitle());
            System.out.println("Description: " + timeline.getDescription());
            System.out.println("StartDate: " + timeline.getStartDate());
            System.out.println("EndDate: " + timeline.getEndDate());
            System.out.println("Visibility: " + timeline.getVisibility());
            System.out.println("Owner ID: " + (timeline.getOwner() != null ? timeline.getOwner().getId() : "null"));
            System.out.println("Member Count: " + (timeline.getMembers() != null ? timeline.getMembers().size() : 0));
            System.out.println("Event Count: " + (timeline.getEvents() != null ? timeline.getEvents().size() : 0));
            System.out.println("CreatedAt: " + timeline.getCreatedAt());
            System.out.println("UpdatedAt: " + timeline.getUpdatedAt());

            if (timeline.getEvents() != null && !timeline.getEvents().isEmpty()) {
                System.out.println("\n--- EVENT OBJECT STRUCTURE (First Event Sample) ---");
                TimelineEvent firstEvent = timeline.getEvents().iterator().next();
                System.out.println("Event ID: " + firstEvent.getId());
                System.out.println("External Place ID: " + firstEvent.getExternalPlaceId());
                System.out.println("Category: " + firstEvent.getCategory());
                System.out.println("StartTime: " + firstEvent.getStartTime());
                System.out.println("EndTime: " + firstEvent.getEndTime());
                System.out.println("Order Index: " + firstEvent.getOrderIndex());
                System.out.println("Notes: " + firstEvent.getNotes());
                System.out.println("Status: " + firstEvent.getStatus());
                System.out.println("Version: " + firstEvent.getVersion());
                System.out.println("CreatedAt: " + firstEvent.getCreatedAt());
                System.out.println("UpdatedAt: " + firstEvent.getUpdatedAt());
            } else {
                System.out.println("\n[No events found for this timeline]");
            }
        } else {
            System.out.println("\n[ERROR] Timeline with ID " + tripId + " not found in database.");
        }
        System.out.println("\n==============================================\n");
    }
}
