package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.ChangePasswordRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.PagedResponseDto;
import com.tfg.agile.app.user_service.dto.UpdateNotificationSettingsRequestDto;
import com.tfg.agile.app.user_service.dto.UpdateUserProfileRequestDto;
import com.tfg.agile.app.user_service.dto.UserProfileResponseDto;
import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.NotificationSettings;
import com.tfg.agile.app.user_service.entity.RefreshToken;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.exception.InvalidPasswordChangeException;
import com.tfg.agile.app.user_service.exception.NotificationNotFoundException;
import com.tfg.agile.app.user_service.repository.NotificationRepository;
import com.tfg.agile.app.user_service.repository.NotificationSettingsRepository;
import com.tfg.agile.app.user_service.repository.RefreshTokenRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private NotificationSettingsRepository notificationSettingsRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private MessageSource messageSource;

    private UserProfileService userProfileService;

    @BeforeEach
    void setUp() {
        userProfileService = new UserProfileService(
                userRepository,
                refreshTokenRepository,
                notificationRepository,
                notificationSettingsRepository,
                passwordEncoder,
                avatarStorageService,
                messageSource
        );
    }

    @Test
    void me_usesUsernameWhenFullNameMissing() {
        User user = TestDataFactory.user();
        user.setFullName(" ");
        user.setUpdatedAt(null);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserProfileResponseDto response = userProfileService.me(user.getId());

        assertThat(response.getFullName()).isEqualTo(user.getUsername());
        assertThat(response.getUpdatedAt()).isEqualTo(user.getCreatedAt());
    }

    @Test
    void updateProfile_trimsFields() {
        User user = TestDataFactory.user();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        UserProfileResponseDto response = userProfileService.updateProfile(
                user.getId(),
                new UpdateUserProfileRequestDto("  New Name  ", "  New bio  ")
        );

        assertThat(user.getFullName()).isEqualTo("New Name");
        assertThat(user.getBio()).isEqualTo("New bio");
        assertThat(response.getFullName()).isEqualTo("New Name");
    }

    @Test
    void changePassword_withInvalidCurrentPassword_throws() {
        User user = TestDataFactory.user();
        user.setHasLocalPassword(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad-current", user.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> userProfileService.changePassword(
                user.getId(),
                new ChangePasswordRequestDto("bad-current", "new-secret")
        )).isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void changePassword_disallowsReusingSamePassword() {
        User user = TestDataFactory.user();
        user.setHasLocalPassword(true);
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current", user.getPasswordHash())).thenReturn(true);

        assertThatThrownBy(() -> userProfileService.changePassword(
                user.getId(),
                new ChangePasswordRequestDto("current", "current")
        )).isInstanceOf(InvalidPasswordChangeException.class);
    }

    @Test
    void changePassword_success_updatesAndRevokesTokens() {
        User user = TestDataFactory.user();
        user.setHasLocalPassword(true);
        user.setTokenVersion(2);
        RefreshToken activeToken = TestDataFactory.refreshToken(user);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current", user.getPasswordHash())).thenReturn(true);
        when(passwordEncoder.matches("new-secret", user.getPasswordHash())).thenReturn(false);
        when(passwordEncoder.encode("new-secret")).thenReturn("encoded-new");
        when(messageSource.getMessage(anyString(), any(), anyString(), any(java.util.Locale.class))).thenReturn("ok");
        when(refreshTokenRepository.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of(activeToken));

        MessageResponseDto response = userProfileService.changePassword(
                user.getId(),
                new ChangePasswordRequestDto("current", "new-secret")
        );

        assertThat(response.getMessage()).isEqualTo("ok");
        assertThat(user.getPasswordHash()).isEqualTo("encoded-new");
        assertThat(user.getTokenVersion()).isEqualTo(3);
        assertThat(activeToken.getRevokedAt()).isNotNull();
    }

    @Test
    void changePassword_googleUserCanCreateLocalPasswordWithoutCurrent() {
        User user = TestDataFactory.user();
        user.setHasLocalPassword(false);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("new-secret", user.getPasswordHash())).thenReturn(false);
        when(passwordEncoder.encode("new-secret")).thenReturn("encoded-new");
        when(refreshTokenRepository.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of());

        userProfileService.changePassword(user.getId(), new ChangePasswordRequestDto(null, "new-secret"));

        assertThat(user.isHasLocalPassword()).isTrue();
        verify(passwordEncoder, never()).matches("", user.getPasswordHash());
    }

    @Test
    void uploadAvatar_savesAvatarUrlOnUser() throws IOException {
        User user = TestDataFactory.user();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(avatarStorageService.store(any(User.class), any())).thenReturn("http://cdn/avatar.png");

        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});

        var response = userProfileService.uploadAvatar(user.getId(), file);

        assertThat(response.getAvatarUrl()).isEqualTo("http://cdn/avatar.png");
        assertThat(user.getAvatarUrl()).isEqualTo("http://cdn/avatar.png");
    }

    @Test
    void getNotifications_unreadOnly_usesFilteredQueryAndSafePagination() {
        User user = TestDataFactory.user();
        Notification unread = TestDataFactory.notification(user, false);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationRepository.findByUserIdAndIsReadFalse(any(), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(unread)));

        PagedResponseDto<?> page = userProfileService.getNotifications(user.getId(), true, -1, 1000);

        assertThat(page.getItems()).hasSize(1);
        verify(notificationRepository).findByUserIdAndIsReadFalse(any(), any(PageRequest.class));
    }

    @Test
    void markNotificationAsRead_throwsWhenMissing() {
        User user = TestDataFactory.user();
        when(notificationRepository.findByIdAndUserId(any(), any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userProfileService.markNotificationAsRead(user.getId(), user.getId()))
                .isInstanceOf(NotificationNotFoundException.class);
    }

    @Test
    void markNotificationAsRead_marksOnlyWhenUnread() {
        User user = TestDataFactory.user();
        Notification notification = TestDataFactory.notification(user, false);
        when(notificationRepository.findByIdAndUserId(notification.getId(), user.getId()))
                .thenReturn(Optional.of(notification));

        var response = userProfileService.markNotificationAsRead(user.getId(), notification.getId());

        assertThat(notification.isRead()).isTrue();
        assertThat(response.isRead()).isTrue();
    }

    @Test
    void getNotificationSettings_createsDefaultsWhenMissing() {
        User user = TestDataFactory.user();
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.empty());
        when(notificationSettingsRepository.save(any(NotificationSettings.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = userProfileService.getNotificationSettings(user.getId());

        assertThat(response.isEmailNotificationsEnabled()).isTrue();
        assertThat(response.isInAppNotificationsEnabled()).isTrue();
        verify(notificationSettingsRepository).save(any(NotificationSettings.class));
    }

    @Test
    void updateNotificationSettings_updatesOnlyProvidedFields() {
        User user = TestDataFactory.user();
        NotificationSettings settings = TestDataFactory.notificationSettings(user);

        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(notificationSettingsRepository.findByUserId(user.getId())).thenReturn(Optional.of(settings));

        var response = userProfileService.updateNotificationSettings(
                user.getId(),
                new UpdateNotificationSettingsRequestDto(false, null, false, null)
        );

        assertThat(response.isEmailNotificationsEnabled()).isFalse();
        assertThat(response.isProjectUpdatesEnabled()).isFalse();
        assertThat(response.isInAppNotificationsEnabled()).isTrue();
        assertThat(response.isTaskRemindersEnabled()).isTrue();
    }
}

