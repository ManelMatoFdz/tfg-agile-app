package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponseDto register(@RequestBody @Valid RegisterRequestDto req) {
        return authService.register(req);
    }

    @PostMapping("/login")
    public AuthResponseDto login(@RequestBody @Valid LoginRequestDto req) {
        return authService.login(req);
    }

    @GetMapping("/me")
    public UserResponseDto me(Authentication authentication) {
        String email = (String) authentication.getPrincipal();
        return authService.me(email);
    }
}
