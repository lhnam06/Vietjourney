package com.project.backend.service;

import com.project.backend.dto.request.UserCreationRequest;
import com.project.backend.entity.User;
import com.project.backend.exception.AppException;
import com.project.backend.exception.ErrorCode;
import com.project.backend.mapper.UserMapper;
import com.project.backend.repository.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserService {
    UserRepository userRepository;
    UserMapper userMapper;

    public User createUser(UserCreationRequest request){
        if(userRepository.existsByUsername(request.getUsername())){
            throw new AppException(ErrorCode.USERNAME_EXISTS);
        }

        // DTO -> Entity
        User user = userMapper.toUser(request);

        // Encode password
        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(10);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        // Store to database
        return userRepository.save(user);
    }
}
