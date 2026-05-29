package com.project.backend.modules.recommendation.entity;

import com.project.backend.modules.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_tag_preferences",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_tag_preference", columnNames = {"user_id", "tag_group", "tag_value"}),
        indexes = @Index(name = "idx_user_tag_preferences_user_score", columnList = "user_id, score"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserTagPreference {
    @Id
    @UuidGenerator
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "tag_group", nullable = false)
    String tagGroup;

    @Column(name = "tag_value", nullable = false)
    String tagValue;

    @Column(nullable = false)
    Double score;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;
}
