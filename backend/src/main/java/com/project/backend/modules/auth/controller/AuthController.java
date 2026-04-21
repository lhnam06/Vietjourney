package com.project.backend.modules.auth.controller;
import com.nimbusds.jose.JOSEException;
import com.project.backend.modules.auth.dto.request.AuthenticationRequest;
import com.project.backend.modules.auth.dto.request.IntrospectRequest;
import com.project.backend.modules.auth.dto.request.LogoutRequest;
import com.project.backend.modules.auth.dto.request.RefreshRequest;
import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.auth.dto.response.AuthenticationResponse;
import com.project.backend.modules.auth.dto.response.IntrospectResponse;
import com.project.backend.modules.auth.service.AuthService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.text.ParseException;

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

    @PostMapping("/logout")
    public ApiResponse<Void> logout(@RequestBody LogoutRequest request){
        authService.logout(request);
        return ApiResponse.<Void>builder().build();
    }

    @PostMapping("/refresh")
    public ApiResponse<AuthenticationResponse> authenticate(@RequestBody RefreshRequest request) throws ParseException, JOSEException {
        var result = authService.refreshToken(request);
        return ApiResponse.<AuthenticationResponse>builder().result(result).build();
    }

}
