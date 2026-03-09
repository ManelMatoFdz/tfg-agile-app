package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.exception.EmailAlreadyExistsException;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.exception.UserNotFoundException;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.security.JwtService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AuthService {

    private static final String UNIQUE_EMAIL_CONSTRAINT = "uk_users_email";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponseDto register(RegisterRequestDto req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new EmailAlreadyExistsException();
        }

        User user = User.builder()
                .username(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .createdAt(Instant.now())
                .build();

        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            if (isUniqueEmailViolation(ex)) {
                throw new EmailAlreadyExistsException();
            }
            throw ex;
        }

        String token = jwtService.generateToken(saved.getEmail());

        return new AuthResponseDto(token, toUserResponse(saved));
    }

    public AuthResponseDto login(LoginRequestDto req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponseDto(token, toUserResponse(user));
    }

    public UserResponseDto me(String emailFromToken) {
        User user = userRepository.findByEmail(emailFromToken)
                .orElseThrow(UserNotFoundException::new);
        return toUserResponse(user);
    }

    private UserResponseDto toUserResponse(User u) {
        return new UserResponseDto(u.getId(), u.getUsername(), u.getEmail(), u.getCreatedAt());
    }

    private boolean isUniqueEmailViolation(DataIntegrityViolationException ex) {
        Throwable cause = ex;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null && message.contains(UNIQUE_EMAIL_CONSTRAINT)) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }
}
