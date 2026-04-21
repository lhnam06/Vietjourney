package com.project.backend.service;

import com.project.backend.constant.RoleConstant;
import com.project.backend.dto.request.ChangeDisplaynameRequest;
import com.project.backend.dto.request.UserCreationRequest;
import com.project.backend.dto.request.ChangePasswordRequest;
import com.project.backend.dto.response.UserResponse;
import com.project.backend.entity.Role;
import com.project.backend.entity.User;
import com.project.backend.exception.AppException;
import com.project.backend.exception.ErrorCode;
import com.project.backend.mapper.UserMapper;
import com.project.backend.repository.RoleRepository;
import com.project.backend.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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
        );        user.setRoles(roles);
        user = userRepository.save(user);

        // Store to database
        return userMapper.toUserResponse(user);
    }

    @PreAuthorize("hasRole('USER')")
    public UserResponse updateDisplayName(String userID, ChangeDisplaynameRequest request){
        User user = userRepository.findById(userID).orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));
        user.setDisplayName(request.getDisplayName());

        return userMapper.toUserResponse(userRepository.save(user));
    }

    @PreAuthorize("hasRole('USER')")
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

    @PreAuthorize("hasRole('USER')")
    public UserResponse getMyInfo(){
        var context = SecurityContextHolder.getContext();
        String name = context.getAuthentication().getName();

        User user = userRepository.findByUsername(name)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXIST));

        return userMapper.toUserResponse(user);
    }
}
