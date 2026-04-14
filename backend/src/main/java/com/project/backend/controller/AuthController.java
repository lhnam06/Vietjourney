package com.project.backend.controller;
import com.project.backend.dto.request.AuthenticationRequest;
import com.project.backend.dto.request.IntrospectRequest;
import com.project.backend.dto.response.ApiResponse;
import com.project.backend.dto.response.AuthenticationResponse;
import com.project.backend.dto.response.IntrospectResponse;
import com.project.backend.service.AuthService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AuthController {
    AuthService authService;

    @PostMapping("/login")
    public ApiResponse<AuthenticationResponse> authenticate(@RequestBody AuthenticationRequest loginRequest){
        var result = authService.authenticate(loginRequest);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

    @PostMapping("/introspect")
    public ApiResponse<IntrospectResponse> authenticate(@RequestBody IntrospectRequest introspectRequest){
        var result = authService.introspect(introspectRequest);
        return ApiResponse.<IntrospectResponse>builder().result(result).build();
    }

}
