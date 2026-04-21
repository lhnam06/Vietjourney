package com.project.backend.modules.auth.mapper;

import com.project.backend.modules.auth.dto.request.PermissionRequest;
import com.project.backend.modules.auth.dto.response.PermissionResponse;
import com.project.backend.modules.auth.entity.Permission;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermissionMapper {
    Permission toPermission(PermissionRequest request);
    PermissionResponse toPermissionResponse(Permission permission);
}
