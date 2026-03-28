package com.tfg.agile.app.user_service.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class LocalAvatarStorageService implements AvatarStorageService {

    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;
    private static final Map<String, String> CONTENT_TYPE_TO_EXTENSION = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp",
            "image/gif", "gif"
    );
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };
    private static final byte[] GIF87A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x37, 0x61};
    private static final byte[] GIF89A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x39, 0x61};
    private static final byte[] RIFF_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46};
    private static final byte[] WEBP_MAGIC = new byte[]{0x57, 0x45, 0x42, 0x50};

    private final Path storageDir;
    private final String publicBaseUrl;

    public LocalAvatarStorageService(
            @Value("${app.avatar.storage-dir:/tmp/agileflow-avatars}") String storageDir,
            @Value("${app.avatar.public-base-url:http://localhost:8081/assets/avatars}") String publicBaseUrl
    ) {
        this.storageDir = Path.of(storageDir).toAbsolutePath().normalize();
        this.publicBaseUrl = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
    }

    @Override
    public String store(UUID userId, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file is empty");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new IllegalArgumentException("Avatar file exceeds maximum allowed size");
        }

        byte[] content = file.getBytes();
        String extension = detectImageExtension(content);
        if (extension == null) {
            throw new IllegalArgumentException("Unsupported avatar file type");
        }

        String declaredContentType = normalizeContentType(file.getContentType());
        if (declaredContentType != null) {
            String declaredExtension = CONTENT_TYPE_TO_EXTENSION.get(declaredContentType);
            if (declaredExtension != null && !declaredExtension.equals(extension)) {
                throw new IllegalArgumentException("Avatar content type does not match file content");
            }
        }

        Files.createDirectories(storageDir);
        String filename = userId + "-" + Instant.now().toEpochMilli() + "." + extension;
        Path destination = storageDir.resolve(filename).normalize();
        if (!destination.startsWith(storageDir)) {
            throw new IllegalArgumentException("Invalid avatar storage path");
        }

        Files.write(destination, content);

        return publicBaseUrl + "/" + filename;
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        return contentType.toLowerCase(Locale.ROOT).trim();
    }

    private static String detectImageExtension(byte[] content) {
        if (hasPrefix(content, JPEG_MAGIC)) {
            return "jpg";
        }
        if (hasPrefix(content, PNG_MAGIC)) {
            return "png";
        }
        if (hasPrefix(content, GIF87A_MAGIC) || hasPrefix(content, GIF89A_MAGIC)) {
            return "gif";
        }
        if (hasWebpHeader(content)) {
            return "webp";
        }
        return null;
    }

    private static boolean hasWebpHeader(byte[] content) {
        return content.length >= 12
                && hasPrefix(content, RIFF_MAGIC)
                && matchesAt(content, WEBP_MAGIC, 8);
    }

    private static boolean hasPrefix(byte[] content, byte[] magic) {
        return matchesAt(content, magic, 0);
    }

    private static boolean matchesAt(byte[] content, byte[] magic, int offset) {
        if (content.length < offset + magic.length) {
            return false;
        }
        for (int i = 0; i < magic.length; i++) {
            if (content[offset + i] != magic[i]) {
                return false;
            }
        }
        return true;
    }
}
