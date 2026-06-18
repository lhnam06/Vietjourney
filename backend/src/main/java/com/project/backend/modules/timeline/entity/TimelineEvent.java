package com.project.backend.modules.timeline.entity;

import com.project.backend.modules.timeline.enums.TimelineEventStatus;
import com.project.backend.modules.timeline.enums.TimelineEventCategory;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "timeline_events")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "timeline")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineEvent {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timeline_id", nullable = false)
    Timeline timeline;

    @Column(nullable = false)
    String externalPlaceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    TimelineEventCategory category;

    @Column(nullable = false)
    LocalDateTime startTime;

    @Column(nullable = false)
    LocalDateTime endTime;

    @Column(nullable = false)
    Integer orderIndex;

    @Column(columnDefinition = "TEXT")
    String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    TimelineEventStatus status;

    @Version
    @Column(nullable = false)
    Long version;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    LocalDateTime updatedAt;
}
