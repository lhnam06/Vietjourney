package com.project.backend.mapper;

import com.project.backend.dto.request.PermissionRequest;
import com.project.backend.dto.response.PermissionResponse;
import com.project.backend.entity.Permission;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);
    PermissionResponse toPermissionResponse(Permission permission);
}
