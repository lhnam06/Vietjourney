package com.project.chat_service.repository;

import com.project.chat_service.entity.ChatRoom;
import com.project.chat_service.entity.ChatRoomType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, String> {
    List<ChatRoom> findAllByType(ChatRoomType type);
}
