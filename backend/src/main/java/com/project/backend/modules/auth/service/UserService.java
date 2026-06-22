package com.project.backend.modules.auth.service;

import com.project.backend.common.constant.RoleConstant;
import com.project.backend.modules.auth.dto.request.ChangeDisplaynameRequest;
import com.project.backend.modules.auth.dto.request.UserCreationRequest;
import com.project.backend.modules.auth.dto.request.ChangePasswordRequest;
import com.project.backend.modules.auth.dto.response.UserResponse;
import com.project.backend.modules.auth.event.UserRegisteredEvent;
import com.project.backend.modules.auth.entity.Role;
import com.project.backend.modules.auth.entity.User;
import com.project.backend.common.exception.AppException;
import com.project.backend.common.exception.ErrorCode;
import com.project.backend.modules.auth.mapper.UserMapper;
import com.project.backend.modules.auth.repository.RoleRepository;
import com.project.backend.modules.auth.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    UserMapper userMapper;
    PasswordEncoder passwordEncoder;
    RoleRepository roleRepository;
    ApplicationEventPublisher applicationEventPublisher;

    @Transactional
    public UserResponse createUser(UserCreationRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new AppException(ErrorCode.USER_EXISTED);
        }

        // DTO -> Entity
        User user = userMapper.toUser(request);

        // Encode password
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Set role
        HashSet<Role> roles = new HashSet<>();
        roles.add(
                roleRepository.findById(RoleConstant.USER_ROLE)
                        .orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXIST))
        );
        user.setRoles(roles);
        user = userRepository.save(user);
        applicationEventPublisher.publishEvent(UserRegisteredEvent.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .build());

        // Store to database
        return userMapper.toUserResponse(user);
    }

    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public UserResponse updateDisplayName(String userID, ChangeDisplaynameRequest request){
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
        user.setDisplayName(request.getDisplayName());

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public UserResponse changePassword(String userID, ChangePasswordRequest request){
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
        boolean oldPasswordMatch = passwordEncoder.matches(request.getOldPassword(), user.getPassword());
        if(!oldPasswordMatch){
            throw new AppException(ErrorCode.PASSWORD_INCORRECT);
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasRole('ADMIN')")
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream().map(userMapper::toUserResponse).toList();
    }

    @PreAuthorize("hasAnyRole('USER', 'LEADER', 'ADMIN')")
    public UserResponse getMyInfo(){
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByUsername(name)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));

        return userMapper.toUserResponse(user);
    }
}
