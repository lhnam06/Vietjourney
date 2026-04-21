package com.project.backend.service;

import com.project.backend.dto.request.RoleRequest;
import com.project.backend.dto.response.RoleResponse;
import com.project.backend.exception.AppException;
import com.project.backend.exception.ErrorCode;
import com.project.backend.mapper.RoleMapper;
import com.project.backend.repository.PermissionRepository;
import com.project.backend.repository.RoleRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;

import java.util.HashSet;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoleService {
    RoleRepository roleRepository;
    PermissionRepository permissionRepository;
    RoleMapper roleMapper;

    public RoleResponse createRole(RoleRequest request) {
        var role = roleMapper.toRole(request);
        var permissions = permissionRepository.findAllById(request.getPermissions());

        role.setPermissions(new HashSet<>(permissions));
        role = roleRepository.save(role);

        return roleMapper.toRoleResponse(role);
    }

    public RoleResponse updateRole(String name, RoleRequest request) {
        var role = roleRepository.findById(name).orElseThrow(() -> new AppException(ErrorCode.ROLE_NOT_EXIST));
        var permissions = permissionRepository.findAllById(request.getPermissions());

        role.setPermissions(new HashSet<>(permissions));
        role = roleRepository.save(role);

        return roleMapper.toRoleResponse(role);
    }
}
