package com.project.backend.modules.auth.controller;

import com.project.backend.modules.auth.dto.request.ChangePasswordRequest;
import com.project.backend.modules.auth.dto.request.ChangeDisplaynameRequest;
import com.project.backend.modules.auth.dto.request.UserCreationRequest;
import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.auth.dto.response.UserResponse;
import com.project.backend.modules.auth.service.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("api/v1/users")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    UserService userService;


    @PostMapping("/register")
    public ApiResponse<UserResponse> createUser(@RequestBody @Valid UserCreationRequest request){
        return ApiResponse.<UserResponse>builder()
                .result(userService.createUser(request))
                .build();
    }

    @GetMapping("/all")
    public ApiResponse<List<UserResponse>> getALlUsers(){
        return ApiResponse.<List<UserResponse>>builder()
                .result(userService.getAllUsers())
                .build();
    }

    @GetMapping("/my-info")
    public ApiResponse<UserResponse> getMyInfo(){
        return ApiResponse.<UserResponse>builder()
                .result(userService.getMyInfo())
                .build();
    }

    @PatchMapping("/my-display-name")
    public ApiResponse<UserResponse> changeMyDisplayName(@RequestBody @Valid ChangeDisplaynameRequest request){
        UserResponse currentUser = userService.getMyInfo();
        return ApiResponse.<UserResponse>builder()
                .result(userService.updateDisplayName(currentUser.getId(), request))
                .build();
    }

    @PatchMapping("/my-password")
    public ApiResponse<UserResponse> changeMyPassword(@RequestBody @Valid ChangePasswordRequest request){
        UserResponse currentUser = userService.getMyInfo();
        return ApiResponse.<UserResponse>builder()
                .result(userService.changePassword(currentUser.getId(), request))
                .build();
    }
}
