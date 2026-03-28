package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

public interface AvatarStorageService {

    String store(User user, MultipartFile file) throws IOException;

    Optional<StoredAvatar> load(UUID userId);

    record StoredAvatar(byte[] content, String contentType) {
    }
}
