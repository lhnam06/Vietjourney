package com.project.backend.modules.auth.mapper;

import com.project.backend.modules.auth.dto.request.UserCreationRequest;
import com.project.backend.modules.auth.dto.response.UserResponse;
import com.project.backend.modules.auth.entity.User;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface UserMapper{
    User toUser(UserCreationRequest request);
    UserResponse toUserResponse(User user);
}
