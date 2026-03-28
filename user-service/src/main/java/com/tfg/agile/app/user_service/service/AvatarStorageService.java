package com.tfg.agile.app.user_service.service;

import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

public interface AvatarStorageService {

    String store(UUID userId, MultipartFile file) throws IOException;
}
