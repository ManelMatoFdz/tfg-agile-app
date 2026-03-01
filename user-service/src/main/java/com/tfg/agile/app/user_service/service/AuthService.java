package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.repository.UserDao;
import com.tfg.agile.app.user_service.security.JwtService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private final UserDao userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserDao userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponseDto register(RegisterRequestDto req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new RuntimeException("EMAIL_ALREADY_EXISTS");
        }

        User user = User.builder()
                .username(req.getName())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .createdAt(Instant.now())
                .build();

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved.getEmail());

        return new AuthResponseDto(token, toUserResponse(saved));
    }

    public AuthResponseDto login(LoginRequestDto req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new RuntimeException("INVALID_CREDENTIALS"));

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("INVALID_CREDENTIALS");
        }

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponseDto(token, toUserResponse(user));
    }

    public UserResponseDto me(String emailFromToken) {
        User user = userRepository.findByEmail(emailFromToken)
                .orElseThrow(() -> new RuntimeException("USER_NOT_FOUND"));
        return toUserResponse(user);
    }

    private UserResponseDto toUserResponse(User u) {
        return new UserResponseDto(u.getId(), u.getUsername(), u.getEmail(), u.getCreatedAt());
    }
}
