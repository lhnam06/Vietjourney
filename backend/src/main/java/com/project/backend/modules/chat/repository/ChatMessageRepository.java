package com.project.backend.modules.chat.repository;

import com.project.backend.modules.chat.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, String> {
    List<ChatMessage> findByTimelineIdOrderByTimestampAsc(String timelineId, Pageable pageable);
}
