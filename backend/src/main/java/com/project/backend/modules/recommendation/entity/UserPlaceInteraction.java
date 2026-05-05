package com.project.backend.modules.recommendation.entity;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.recommendation.enums.RecommendationEventType;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_place_interactions",
        indexes = {
                @Index(name = "idx_user_place_interactions_user_created", columnList = "user_id, created_at"),
                @Index(name = "idx_user_place_interactions_place", columnList = "place_id, category")
        })
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserPlaceInteraction {
    @Id
    @UuidGenerator
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "place_id", nullable = false)
    String placeId;

    @Column(nullable = false)
    String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false)
    RecommendationEventType eventType;

    @Column(nullable = false)
    Integer score;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    LocalDateTime createdAt;
}
