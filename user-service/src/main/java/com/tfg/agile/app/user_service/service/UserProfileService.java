package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.AvatarUploadResponseDto;
import com.tfg.agile.app.user_service.dto.ChangePasswordRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationSettingsResponseDto;
import com.tfg.agile.app.user_service.dto.PagedResponseDto;
import com.tfg.agile.app.user_service.dto.UpdateNotificationSettingsRequestDto;
import com.tfg.agile.app.user_service.dto.UpdateUserProfileRequestDto;
import com.tfg.agile.app.user_service.dto.UserProfileResponseDto;
import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.NotificationSettings;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.exception.InvalidPasswordChangeException;
import com.tfg.agile.app.user_service.exception.NotificationNotFoundException;
import com.tfg.agile.app.user_service.exception.UserNotFoundException;
import com.tfg.agile.app.user_service.repository.NotificationRepository;
import com.tfg.agile.app.user_service.repository.NotificationSettingsRepository;
import com.tfg.agile.app.user_service.repository.RefreshTokenRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Instant;
import java.util.UUID;

@Service
public class UserProfileService {

    private static final String CHANGE_PASSWORD_SUCCESS_KEY = "auth.change-password.success";
    private static final String NOTIFICATIONS_READ_ALL_SUCCESS_KEY = "auth.notifications.read-all.success";
    private static final int DEFAULT_PAGE = 0;
    private static final int DEFAULT_SIZE = 20;
    private static final int MAX_SIZE = 100;

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final NotificationRepository notificationRepository;
    private final NotificationSettingsRepository notificationSettingsRepository;
    private final PasswordEncoder passwordEncoder;
    private final AvatarStorageService avatarStorageService;
    private final MessageSource messageSource;

    public UserProfileService(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            NotificationRepository notificationRepository,
            NotificationSettingsRepository notificationSettingsRepository,
            PasswordEncoder passwordEncoder,
            AvatarStorageService avatarStorageService,
            MessageSource messageSource
    ) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.notificationRepository = notificationRepository;
        this.notificationSettingsRepository = notificationSettingsRepository;
        this.passwordEncoder = passwordEncoder;
        this.avatarStorageService = avatarStorageService;
        this.messageSource = messageSource;
    }

    @Transactional(readOnly = true)
    public UserProfileResponseDto me(UUID userId) {
        User user = getUser(userId);
        return toProfileResponse(user);
    }

    @Transactional
    public UserProfileResponseDto updateProfile(UUID userId, UpdateUserProfileRequestDto req) {
        User user = getUser(userId);
        if (req.getFullName() != null) {
            user.setFullName(req.getFullName().trim());
        }
        if (req.getBio() != null) {
            user.setBio(req.getBio().trim());
        }
        user.setUpdatedAt(Instant.now());
        userRepository.save(user);
        return toProfileResponse(user);
    }

    @Transactional
    public MessageResponseDto changePassword(UUID userId, ChangePasswordRequestDto req) {
        User user = getUser(userId);
        boolean hasLocalPassword = user.isHasLocalPassword();
        if (hasLocalPassword) {
            String currentPassword = req.getCurrentPassword();
            if (currentPassword == null || currentPassword.isBlank()
                    || !passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
                throw new InvalidCredentialsException();
            }
        }
        if (passwordEncoder.matches(req.getNewPassword(), user.getPasswordHash())) {
            throw new InvalidPasswordChangeException();
        }

        Instant now = Instant.now();
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setHasLocalPassword(true);
        user.setTokenVersion(user.getTokenVersion() + 1);
        user.setUpdatedAt(now);
        userRepository.save(user);

        refreshTokenRepository
                .findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(user.getId(), now)
                .forEach(token -> token.setRevokedAt(now));

        String message = messageSource.getMessage(
                CHANGE_PASSWORD_SUCCESS_KEY,
                null,
                "Password has been changed successfully",
                LocaleContextHolder.getLocale()
        );
        return new MessageResponseDto(message);
    }

    @Transactional
    public AvatarUploadResponseDto uploadAvatar(UUID userId, MultipartFile file) {
        User user = getUser(userId);
        try {
            String avatarUrl = avatarStorageService.store(user, file);
            user.setAvatarUrl(avatarUrl);
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
            return new AvatarUploadResponseDto(avatarUrl);
        } catch (IOException ex) {
            throw new IllegalStateException("Unable to store avatar file", ex);
        }
    }

    @Transactional(readOnly = true)
    public PagedResponseDto<NotificationResponseDto> getNotifications(UUID userId, Boolean unreadOnly, Integer page, Integer size) {
        getUser(userId);
        int safePage = page == null || page < 0 ? DEFAULT_PAGE : page;
        int safeSize = size == null || size < 1 ? DEFAULT_SIZE : Math.min(size, MAX_SIZE);
        PageRequest pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "createdAt"));

        Page<Notification> notifications = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByUserIdAndIsReadFalse(userId, pageable)
                : notificationRepository.findByUserId(userId, pageable);

        return new PagedResponseDto<>(
                notifications.map(this::toNotificationResponse).toList(),
                notifications.getNumber(),
                notifications.getSize(),
                notifications.getTotalElements(),
                notifications.getTotalPages(),
                notifications.hasNext()
        );
    }

    @Transactional
    public NotificationResponseDto markNotificationAsRead(UUID userId, UUID notificationId) {
        Notification notification = notificationRepository.findByIdAndUserId(notificationId, userId)
                .orElseThrow(NotificationNotFoundException::new);
        if (!notification.isRead()) {
            notification.setRead(true);
        }
        return toNotificationResponse(notification);
    }

    @Transactional
    public MessageResponseDto markAllNotificationsAsRead(UUID userId) {
        getUser(userId);
        notificationRepository.markAllAsRead(userId);
        String message = messageSource.getMessage(
                NOTIFICATIONS_READ_ALL_SUCCESS_KEY,
                null,
                "All notifications marked as read",
                LocaleContextHolder.getLocale()
        );
        return new MessageResponseDto(message);
    }

    @Transactional
    public NotificationSettingsResponseDto getNotificationSettings(UUID userId) {
        NotificationSettings settings = findOrCreateSettings(getUser(userId));
        return toNotificationSettingsResponse(settings);
    }

    @Transactional
    public NotificationSettingsResponseDto updateNotificationSettings(UUID userId, UpdateNotificationSettingsRequestDto req) {
        NotificationSettings settings = findOrCreateSettings(getUser(userId));

        if (req.getEmailNotificationsEnabled() != null) {
            settings.setEmailNotificationsEnabled(req.getEmailNotificationsEnabled());
        }
        if (req.getInAppNotificationsEnabled() != null) {
            settings.setInAppNotificationsEnabled(req.getInAppNotificationsEnabled());
        }
        if (req.getProjectUpdatesEnabled() != null) {
            settings.setProjectUpdatesEnabled(req.getProjectUpdatesEnabled());
        }
        if (req.getTaskRemindersEnabled() != null) {
            settings.setTaskRemindersEnabled(req.getTaskRemindersEnabled());
        }

        settings.setUpdatedAt(Instant.now());
        notificationSettingsRepository.save(settings);
        return toNotificationSettingsResponse(settings);
    }

    private User getUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(UserNotFoundException::new);
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

    private UserProfileResponseDto toProfileResponse(User user) {
        String fullName = user.getFullName() == null || user.getFullName().isBlank()
                ? user.getUsername()
                : user.getFullName();
        Instant updatedAt = user.getUpdatedAt() == null ? user.getCreatedAt() : user.getUpdatedAt();
        return new UserProfileResponseDto(
                user.getId(),
                fullName,
                user.getEmail(),
                user.getBio(),
                user.getAvatarUrl(),
                user.getCreatedAt(),
                updatedAt,
                user.isHasLocalPassword()
        );
    }

    private NotificationResponseDto toNotificationResponse(Notification notification) {
        return new NotificationResponseDto(
                notification.getId(),
                notification.getTitle(),
                notification.getMessage(),
                notification.getType(),
                notification.isRead(),
                notification.getCreatedAt(),
                notification.getLink()
        );
    }

    private NotificationSettingsResponseDto toNotificationSettingsResponse(NotificationSettings settings) {
        return new NotificationSettingsResponseDto(
                settings.isEmailNotificationsEnabled(),
                settings.isInAppNotificationsEnabled(),
                settings.isProjectUpdatesEnabled(),
                settings.isTaskRemindersEnabled()
        );
    }
}
