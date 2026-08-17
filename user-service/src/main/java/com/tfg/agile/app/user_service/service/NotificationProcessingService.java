package com.tfg.agile.app.user_service.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
    private static final String TYPE_POKER_INVITATION = "POKER_INVITATION";
    private static final int MAX_DATA_LENGTH = 2000;

    private final UserRepository userRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final NotificationRepository notificationRepository;
    private final ObjectMapper objectMapper;

    public NotificationProcessingService(
            UserRepository userRepository,
            NotificationSettingsRepository notificationSettingsRepository,
            NotificationRepository notificationRepository,
            ObjectMapper objectMapper
    ) {
        this.userRepository = userRepository;
        this.notificationSettingsRepository = notificationSettingsRepository;
        this.notificationRepository = notificationRepository;
        this.objectMapper = objectMapper;
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
                    .data(mergeData(message.getData(), message.getActorUserId()))
                    .build();
            notificationRepository.save(notification);
        }
    }

    private NotificationSettings findOrCreateSettings(User user) {
        return notificationSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Instant now = Instant.now();
                    NotificationSettings defaults = NotificationSettings.builder()
                            .user(user)
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
            case TYPE_PROJECT_UPDATE, TYPE_POKER_INVITATION -> settings.isProjectUpdatesEnabled();
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

    private String mergeData(String rawData, java.util.UUID actorUserId) {
        if (actorUserId == null) {
            return rawData;
        }

        ObjectNode merged = objectMapper.createObjectNode();
        if (rawData != null && !rawData.isBlank()) {
            try {
                JsonNode existing = objectMapper.readTree(rawData);
                if (existing.isObject()) {
                    merged.setAll((ObjectNode) existing);
                } else {
                    log.warn("Notification data ignored because it is not a JSON object");
                }
            } catch (Exception ex) {
                log.warn("Notification data ignored because it is not valid JSON: {}", ex.getMessage());
            }
        }

        merged.put("actorUserId", actorUserId.toString());
        String serialized = merged.toString();
        if (serialized.length() > MAX_DATA_LENGTH) {
            log.warn("Notification actor omitted because merged data exceeds {} characters", MAX_DATA_LENGTH);
            return rawData;
        }
        return serialized;
    }
}
