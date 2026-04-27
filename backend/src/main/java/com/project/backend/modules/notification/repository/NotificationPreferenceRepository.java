package com.project.backend.modules.notification.repository;

import com.project.backend.modules.notification.entity.NotificationPreference;
import com.project.backend.modules.notification.enums.NotificationCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, String> {
    List<NotificationPreference> findAllByUserUsernameOrderByCategoryAsc(String username);

    Optional<NotificationPreference> findByUser_IdAndCategory(String userId, NotificationCategory category);
}
