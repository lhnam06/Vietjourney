package com.project.backend.modules.notification.repository;

import com.project.backend.modules.notification.entity.Notification;
import com.project.backend.modules.notification.enums.NotificationCategory;
import com.project.backend.modules.notification.enums.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, String> {
    @Query("""
            select n from Notification n
            where n.user.username = :username
              and (:category is null or n.category = :category)
              and (:status is null or n.status = :status)
              and (:includeArchived = true or n.archivedAt is null)
            order by n.createdAt desc, n.id desc
            """)
    Page<Notification> searchMyNotifications(
            @Param("username") String username,
            @Param("status") NotificationStatus status,
            @Param("category") NotificationCategory category,
            @Param("includeArchived") boolean includeArchived,
            Pageable pageable
    );

    long countByUserUsernameAndStatusAndArchivedAtIsNull(String username, NotificationStatus status);

    Optional<Notification> findByIdAndUserUsername(String id, String username);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification n
            set n.status = com.project.backend.modules.notification.enums.NotificationStatus.READ,
                n.readAt = :readAt
            where n.user.id = :userId
              and n.status = com.project.backend.modules.notification.enums.NotificationStatus.UNREAD
              and n.archivedAt is null
            """)
    int markAllAsRead(@Param("userId") String userId, @Param("readAt") LocalDateTime readAt);
}
