package com.project.backend.modules.recommendation.entity;

import com.project.backend.modules.auth.entity.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_category_preferences",
        uniqueConstraints = @UniqueConstraint(name = "uk_user_category_preference", columnNames = {"user_id", "category"}),
        indexes = @Index(name = "idx_user_category_preferences_user_score", columnList = "user_id, score"))
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class UserCategoryPreference {
    @Id
    @UuidGenerator
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(nullable = false)
    String category;

    @Column(nullable = false)
    Double score;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    LocalDateTime updatedAt;
}
