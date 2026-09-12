package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/internal/users")
public class InternalTokenController {

    private final UserRepository userRepository;

    public InternalTokenController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/{userId}/token-version")
    public ResponseEntity<Map<String, Integer>> getTokenVersion(@PathVariable UUID userId) {
        return userRepository.findById(userId)
                .map(user -> ResponseEntity.ok(Map.of("tokenVersion", user.getTokenVersion())))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}