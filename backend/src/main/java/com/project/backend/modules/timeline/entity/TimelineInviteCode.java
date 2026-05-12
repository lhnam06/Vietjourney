package com.project.backend.modules.timeline.entity;

import com.project.backend.modules.auth.entity.User;
import com.project.backend.modules.timeline.enums.TimelineMemberRole;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "timeline_invite_codes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TimelineInviteCode {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "timeline_id", nullable = false)
    Timeline timeline;

    @Column(name = "code_hash", nullable = false, length = 128)
    String codeHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    TimelineMemberRole role;

    @Column(nullable = false)
    int maxUses;

    @Column(nullable = false)
    int usedCount;

    @Column(nullable = false)
    boolean active;

    @Column(nullable = false)
    LocalDateTime expiresAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by_id", nullable = false)
    User createdBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    LocalDateTime updatedAt;
}
