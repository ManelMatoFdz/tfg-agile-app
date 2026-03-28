package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.entity.UserAvatar;
import com.tfg.agile.app.user_service.repository.UserAvatarRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class DatabaseAvatarStorageService implements AvatarStorageService {

    private static final long MAX_AVATAR_BYTES = 5L * 1024 * 1024;
    private static final Set<String> SUPPORTED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif"
    );
    private static final byte[] JPEG_MAGIC = new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] PNG_MAGIC = new byte[]{
            (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    };
    private static final byte[] GIF87A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x37, 0x61};
    private static final byte[] GIF89A_MAGIC = new byte[]{0x47, 0x49, 0x46, 0x38, 0x39, 0x61};
    private static final byte[] RIFF_MAGIC = new byte[]{0x52, 0x49, 0x46, 0x46};
    private static final byte[] WEBP_MAGIC = new byte[]{0x57, 0x45, 0x42, 0x50};

    private final UserAvatarRepository userAvatarRepository;
    private final String publicBaseUrl;

    public DatabaseAvatarStorageService(
            UserAvatarRepository userAvatarRepository,
            @Value("${app.avatar.public-base-url:http://localhost:8081/assets/avatars}") String publicBaseUrl
    ) {
        this.userAvatarRepository = userAvatarRepository;
        this.publicBaseUrl = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
    }

    @Override
    public String store(User user, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Avatar file is empty");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new IllegalArgumentException("Avatar file exceeds maximum allowed size");
        }

        byte[] content = file.getBytes();
        String detectedContentType = detectImageContentType(content);
        if (detectedContentType == null) {
            throw new IllegalArgumentException("Unsupported avatar file type");
        }

        String declaredContentType = normalizeContentType(file.getContentType());
        if (declaredContentType != null
                && SUPPORTED_CONTENT_TYPES.contains(declaredContentType)
                && !declaredContentType.equals(detectedContentType)) {
            throw new IllegalArgumentException("Avatar content type does not match file content");
        }

        UserAvatar avatar = userAvatarRepository.findByUserId(user.getId())
                .orElseGet(() -> UserAvatar.builder().user(user).build());
        avatar.setImageData(content);
        avatar.setContentType(detectedContentType);
        avatar.setUpdatedAt(Instant.now());
        userAvatarRepository.save(avatar);

        return publicBaseUrl + "/" + user.getId();
    }

    @Override
    public Optional<StoredAvatar> load(UUID userId) {
        return userAvatarRepository.findByUserId(userId)
                .map(avatar -> new StoredAvatar(avatar.getImageData(), avatar.getContentType()));
    }

    private static String normalizeContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return null;
        }
        return contentType.toLowerCase(Locale.ROOT).trim();
    }

    private static String detectImageContentType(byte[] content) {
        if (hasPrefix(content, JPEG_MAGIC)) {
            return "image/jpeg";
        }
        if (hasPrefix(content, PNG_MAGIC)) {
            return "image/png";
        }
        if (hasPrefix(content, GIF87A_MAGIC) || hasPrefix(content, GIF89A_MAGIC)) {
            return "image/gif";
        }
        if (hasWebpHeader(content)) {
            return "image/webp";
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
