package com.project.chat_service.service;

import com.project.chat_service.dto.ChatRoomResponse;
import com.project.chat_service.dto.CreateDirectRoomRequest;
import com.project.chat_service.dto.CreateGroupRoomRequest;
import com.project.chat_service.entity.ChatRoom;
import com.project.chat_service.entity.ChatRoomType;
import com.project.chat_service.exception.BadRequestException;
import com.project.chat_service.exception.NotFoundException;
import com.project.chat_service.repository.ChatRoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ChatRoomService {

    private final ChatRoomRepository chatRoomRepository;

    @Transactional
    public ChatRoomResponse createDirectRoom(CreateDirectRoomRequest request) {
        Set<String> participants = normalizedParticipants(List.of(request.firstParticipantId(), request.secondParticipantId()));
        if (participants.size() != 2) {
            throw new BadRequestException("Direct room must contain exactly 2 distinct participants");
        }

        return chatRoomRepository.findAllByType(ChatRoomType.DIRECT).stream()
                .filter(room -> room.getParticipantIds().equals(participants))
                .findFirst()
                .map(ChatRoomResponse::from)
                .orElseGet(() -> ChatRoomResponse.from(chatRoomRepository.save(buildDirectRoom(participants))));
    }

    @Transactional
    public ChatRoomResponse createGroupRoom(CreateGroupRoomRequest request) {
        Set<String> participants = normalizedParticipants(request.participantIds());
        if (participants.size() < 2) {
            throw new BadRequestException("Group room must contain at least 2 participants");
        }

        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setType(ChatRoomType.GROUP);
        chatRoom.setName(request.name().trim());
        chatRoom.setParticipantIds(participants);
        return ChatRoomResponse.from(chatRoomRepository.save(chatRoom));
    }

    @Transactional(readOnly = true)
    public List<ChatRoomResponse> getAllRooms() {
        return chatRoomRepository.findAll().stream()
                .sorted(Comparator.comparing(ChatRoom::getCreatedAt))
                .map(ChatRoomResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ChatRoomResponse getRoom(String roomId) {
        return ChatRoomResponse.from(getRoomEntity(roomId));
    }

    @Transactional(readOnly = true)
    public ChatRoom getRoomEntity(String roomId) {
        return chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new NotFoundException("Chat room not found: " + roomId));
    }

    @Transactional
    public ChatRoom ensureParticipant(String roomId, String participantId) {
        ChatRoom chatRoom = getRoomEntity(roomId);
        if (!chatRoom.getParticipantIds().contains(participantId)) {
            chatRoom.getParticipantIds().add(participantId);
            chatRoom = chatRoomRepository.save(chatRoom);
        }
        return chatRoom;
    }

    private ChatRoom buildDirectRoom(Set<String> participants) {
        ChatRoom chatRoom = new ChatRoom();
        chatRoom.setType(ChatRoomType.DIRECT);
        chatRoom.setName(String.join("__", participants));
        chatRoom.setParticipantIds(participants);
        return chatRoom;
    }

    private Set<String> normalizedParticipants(Iterable<String> participantIds) {
        LinkedHashSet<String> normalized = new LinkedHashSet<>();
        for (String participantId : participantIds) {
            if (participantId == null) {
                continue;
            }
            String trimmed = participantId.trim();
            if (!trimmed.isBlank()) {
                normalized.add(trimmed);
            }
        }
        return normalized.stream()
                .sorted()
                .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
    }
}
