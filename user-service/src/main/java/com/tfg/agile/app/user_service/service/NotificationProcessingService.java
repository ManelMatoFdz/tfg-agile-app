package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.NotificationSettings;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.repository.NotificationRepository;
import com.tfg.agile.app.user_service.repository.NotificationSettingsRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Locale;

@Service
public class NotificationProcessingService {

    private static final Logger log = LoggerFactory.getLogger(NotificationProcessingService.class);
    private static final String TYPE_PROJECT_UPDATE = "PROJECT_UPDATE";
    private static final String TYPE_TASK_REMINDER = "TASK_REMINDER";

    private final UserRepository userRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationEmailSender notificationEmailSender;

    public NotificationProcessingService(
            UserRepository userRepository,
            NotificationSettingsRepository notificationSettingsRepository,
            NotificationRepository notificationRepository,
            NotificationEmailSender notificationEmailSender
    ) {
        this.userRepository = userRepository;
        this.notificationSettingsRepository = notificationSettingsRepository;
        this.notificationRepository = notificationRepository;
        this.notificationEmailSender = notificationEmailSender;
    }

    @Transactional
    public void process(NotificationQueueMessage message) {
        User user = userRepository.findById(message.getUserId()).orElse(null);
        if (user == null) {
            log.warn("Notification ignored because user {} does not exist", message.getUserId());
            return;
        }

        NotificationSettings settings = findOrCreateSettings(user);
        if (!isTypeEnabled(settings, message.getType())) {
            return;
        }

        if (settings.isInAppNotificationsEnabled()) {
            Instant now = Instant.now();
            Notification notification = Notification.builder()
                    .user(user)
                    .title(normalizeTitle(message.getTitle()))
                    .message(normalizeMessage(message.getMessage()))
                    .type(normalizeType(message.getType()))
                    .isRead(false)
                    .createdAt(now)
                    .link(normalizeLink(message.getLink()))
                    .build();
            notificationRepository.save(notification);
        }

        if (settings.isEmailNotificationsEnabled()) {
            notificationEmailSender.sendNotification(
                    user.getEmail(),
                    normalizeTitle(message.getTitle()),
                    normalizeMessage(message.getMessage()),
                    message.getLink()
            );
        }
    }

    private NotificationSettings findOrCreateSettings(User user) {
        return notificationSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Instant now = Instant.now();
                    NotificationSettings defaults = NotificationSettings.builder()
                            .user(user)
                            .emailNotificationsEnabled(true)
                            .inAppNotificationsEnabled(true)
                            .projectUpdatesEnabled(true)
                            .taskRemindersEnabled(true)
                            .createdAt(now)
                            .updatedAt(now)
                            .build();
                    return notificationSettingsRepository.save(defaults);
                });
    }

    private boolean isTypeEnabled(NotificationSettings settings, String type) {
        String normalizedType = normalizeType(type);
        return switch (normalizedType) {
            case TYPE_PROJECT_UPDATE -> settings.isProjectUpdatesEnabled();
            case TYPE_TASK_REMINDER -> settings.isTaskRemindersEnabled();
            default -> true;
        };
    }

    private static String normalizeType(String type) {
        if (type == null || type.isBlank()) {
            return "GENERAL";
        }
        return type.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizeLink(String link) {
        if (link == null) {
            return null;
        }
        String trimmed = link.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String normalizeTitle(String title) {
        if (title == null || title.isBlank()) {
            return "Notification";
        }
        return title.trim();
    }

    private static String normalizeMessage(String message) {
        if (message == null || message.isBlank()) {
            return "You have a new notification.";
        }
        return message.trim();
    }
}
