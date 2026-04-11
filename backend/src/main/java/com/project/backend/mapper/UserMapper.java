package com.project.backend.mapper;

import ch.qos.logback.core.model.ComponentModel;
import com.project.backend.dto.request.UserCreationRequest;
import com.project.backend.dto.request.UserUpdateRequest;
import com.project.backend.dto.response.UserResponse;
import com.project.backend.entity.User;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface UserMapper{
    User toUser(UserCreationRequest request);
    UserResponse toUserResponse(User user);
    void updateUser(@MappingTarget User user, UserUpdateRequest request);
}
