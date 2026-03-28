package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.ForgotPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.RefreshTokenRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.ResetPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

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

    @PostMapping("/forgot-password")
    public MessageResponseDto forgotPassword(@RequestBody @Valid ForgotPasswordRequestDto req) {
        return authService.forgotPassword(req);
    }

    @PostMapping("/reset-password")
    public MessageResponseDto resetPassword(@RequestBody @Valid ResetPasswordRequestDto req) {
        return authService.resetPassword(req);
    }

    @PostMapping("/refresh")
    public AuthResponseDto refresh(@RequestBody @Valid RefreshTokenRequestDto req) {
        return authService.refresh(req);
    }

    @PostMapping("/logout")
    public MessageResponseDto logout(@RequestBody @Valid RefreshTokenRequestDto req) {
        return authService.logout(req);
    }

    @GetMapping("/me")
    public UserResponseDto me(Authentication authentication) {
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (!(principal instanceof String userIdValue) || userIdValue.isBlank()) {
            throw new InvalidCredentialsException();
        }
        try {
            UUID userId = UUID.fromString(userIdValue);
            return authService.me(userId);
        } catch (IllegalArgumentException ex) {
            throw new InvalidCredentialsException();
        }
    }
}
