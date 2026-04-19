package com.project.chat_service.repository;

import com.project.chat_service.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {
    List<Message> findByChatRoomIdOrderBySentAtAsc(String chatRoomId);
}
