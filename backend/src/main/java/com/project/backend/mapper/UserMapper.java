package com.project.backend.mapper;

import com.project.backend.dto.request.UserCreationRequest;
import com.project.backend.dto.request.ChangePasswordRequest;
import com.project.backend.dto.response.UserResponse;
import com.project.backend.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper{
    User toUser(UserCreationRequest request);
    UserResponse toUserResponse(User user);
}
