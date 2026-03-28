package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.service.AvatarStorageService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/assets/avatars")
public class AvatarFileController {

    private final AvatarStorageService avatarStorageService;

    public AvatarFileController(AvatarStorageService avatarStorageService) {
        this.avatarStorageService = avatarStorageService;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<byte[]> getAvatar(@PathVariable UUID userId) {
        AvatarStorageService.StoredAvatar avatar = avatarStorageService.load(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Avatar not found"));

        return ResponseEntity.ok()
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(avatar.contentType()))
                .body(avatar.content());
    }
}
