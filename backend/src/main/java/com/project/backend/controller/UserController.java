package com.project.backend.controller;

import com.project.backend.dto.request.UserCreationRequest;
import com.project.backend.dto.response.ApiResponse;
import com.project.backend.entity.User;
import com.project.backend.service.UserService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequiredArgsConstructor
@RequestMapping("api/v1/users")
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class UserController {
    UserService userService;

    @PostMapping("/register")
    public ApiResponse<User> createUser(@RequestBody @Valid UserCreationRequest request){
        User user = userService.createUser(request);

        // Package in API response
        ApiResponse<User> response = new ApiResponse<>();
        response.setCode(1000);
        response.setMessage("User created successfully");
        response.setResult(user);

        return response;
    }
}
