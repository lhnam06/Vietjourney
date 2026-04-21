package com.project.backend.mapper;

import com.project.backend.dto.request.RoleRequest;
import com.project.backend.dto.response.RoleResponse;

import com.project.backend.entity.Role;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface RoleMapper {
    @Mapping(target = "permissions", ignore = true)
    Role toRole(RoleRequest request);
    RoleResponse toRoleResponse(Role role);
}
