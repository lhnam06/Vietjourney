package com.project.backend.modules.auth.mapper;

import com.project.backend.modules.auth.dto.request.RoleRequest;
import com.project.backend.modules.auth.dto.response.RoleResponse;

import com.project.backend.modules.auth.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);
    RoleResponse toRoleResponse(Role role);
}
