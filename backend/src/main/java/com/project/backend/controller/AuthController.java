package com.project.backend.controller;
import com.project.backend.dto.request.AuthenticationRequest;
import com.project.backend.dto.response.AuthenticationResponse;
import com.project.backend.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthenticationResponse> login(@RequestBody AuthenticationRequest loginRequest){
        boolean isAuthenticated = authService.authenticate(loginRequest).isSuccess();
        // Login Success
        if(isAuthenticated){
            AuthenticationResponse response = new AuthenticationResponse(true, "Login Success!", "NONE");
            return ResponseEntity.ok(response);
        }

        // Login Failed
        else{
            AuthenticationResponse response = new AuthenticationResponse(false, "Wrong Username Or Password!", null);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
        }
    }
}
