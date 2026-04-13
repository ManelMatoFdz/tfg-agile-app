package com.tfg.agile.app.user_service.support;

import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.NotificationSettings;
import com.tfg.agile.app.user_service.entity.PasswordResetToken;
import com.tfg.agile.app.user_service.entity.RefreshToken;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.entity.UserAvatar;

import java.time.Instant;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static User user() {
        Instant now = Instant.now();
        return User.builder()
                .id(UUID.randomUUID())
                .username("jdoe")
                .fullName("John Doe")
                .email("john@example.com")
                .passwordHash("hash")
                .hasLocalPassword(true)
                .tokenVersion(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static RefreshToken refreshToken(User user) {
        return RefreshToken.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tokenHash("hash-refresh")
                .userTokenVersion(user.getTokenVersion())
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    public static PasswordResetToken passwordResetToken(User user) {
        return PasswordResetToken.builder()
                .id(UUID.randomUUID())
                .user(user)
                .tokenHash("hash-reset")
                .createdAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(900))
                .build();
    }

    public static Notification notification(User user, boolean read) {
        return Notification.builder()
                .id(UUID.randomUUID())
                .user(user)
                .title("Title")
                .message("Message")
                .type("INFO")
                .isRead(read)
                .link("/projects/1")
                .createdAt(Instant.now())
                .build();
    }

    public static NotificationSettings notificationSettings(User user) {
        Instant now = Instant.now();
        return NotificationSettings.builder()
                .userId(user.getId())
                .user(user)
                .emailNotificationsEnabled(true)
                .inAppNotificationsEnabled(true)
                .projectUpdatesEnabled(true)
                .taskRemindersEnabled(true)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static UserAvatar userAvatar(User user, byte[] content, String contentType) {
        return UserAvatar.builder()
                .userId(user.getId())
                .user(user)
                .imageData(content)
                .contentType(contentType)
                .updatedAt(Instant.now())
                .build();
    }

    public static NotificationEnqueueRequestDto notificationEnqueueRequestDto(UUID userId) {
        return new NotificationEnqueueRequestDto(
                userId,
                "New notification",
                "Your project has been updated",
                "PROJECT_UPDATE",
                "/projects/123"
        );
    }
}

