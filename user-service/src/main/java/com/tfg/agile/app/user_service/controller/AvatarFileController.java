package com.tfg.agile.app.user_service.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.Set;

import static org.springframework.http.HttpStatus.NOT_FOUND;

@RestController
@RequestMapping("/assets/avatars")
public class AvatarFileController {

    private static final Set<String> SAFE_IMAGE_TYPES = Set.of(
            MediaType.IMAGE_JPEG_VALUE,
            MediaType.IMAGE_PNG_VALUE,
            "image/webp",
            MediaType.IMAGE_GIF_VALUE
    );

    private final Path storageDir;

    public AvatarFileController(@Value("${app.avatar.storage-dir:/tmp/agileflow-avatars}") String storageDir) {
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
    }

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getAvatar(@PathVariable String filename) {
        Path file = storageDir.resolve(filename).normalize();
        if (!file.startsWith(storageDir) || !Files.exists(file) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(NOT_FOUND, "Avatar not found");
        }

        String contentType = "application/octet-stream";
        try {
            String detected = Files.probeContentType(file);
            if (detected != null && !detected.isBlank()) {
                String normalized = detected.toLowerCase(Locale.ROOT).trim();
                if (SAFE_IMAGE_TYPES.contains(normalized)) {
                    contentType = normalized;
                }
            }
        } catch (IOException ignored) {
        }

        return ResponseEntity.ok()
                .header("X-Content-Type-Options", "nosniff")
                .contentType(MediaType.parseMediaType(contentType))
                .body(new FileSystemResource(file));
    }
}
