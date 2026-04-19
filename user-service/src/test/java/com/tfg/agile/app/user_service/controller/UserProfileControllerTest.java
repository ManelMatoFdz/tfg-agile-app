package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.AvatarUploadResponseDto;
import com.tfg.agile.app.user_service.dto.ChangePasswordRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationResponseDto;
import com.tfg.agile.app.user_service.dto.NotificationSettingsResponseDto;
import com.tfg.agile.app.user_service.dto.PagedResponseDto;
import com.tfg.agile.app.user_service.dto.UpdateNotificationSettingsRequestDto;
import com.tfg.agile.app.user_service.dto.UpdateUserProfileRequestDto;
import com.tfg.agile.app.user_service.dto.UserProfileResponseDto;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.service.UserProfileService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileControllerTest {

    @Mock
    private UserProfileService userProfileService;

    @Test
    void endpoints_delegateToUserProfileService() {
        UserProfileController controller = new UserProfileController(userProfileService);
        UUID userId = UUID.randomUUID();
        UUID notificationId = UUID.randomUUID();
        Authentication authentication = new TestingAuthenticationToken(userId.toString(), null);

        UpdateUserProfileRequestDto updateProfileRequest = new UpdateUserProfileRequestDto("John", "Bio");
        ChangePasswordRequestDto changePasswordRequest = new ChangePasswordRequestDto("current", "new-secret");
        UpdateNotificationSettingsRequestDto settingsRequest = new UpdateNotificationSettingsRequestDto(true, false, true, false);
        MockMultipartFile avatarFile = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});

        UserProfileResponseDto profileResponse = new UserProfileResponseDto(userId, "John", "john@example.com", "Bio", null, Instant.now(), Instant.now(), true);
        AvatarUploadResponseDto avatarResponse = new AvatarUploadResponseDto("/assets/avatars/me");
        NotificationResponseDto notificationResponse = new NotificationResponseDto(notificationId, "Title", "Message", "GENERAL", true, Instant.now(), null);
        PagedResponseDto<NotificationResponseDto> pageResponse = new PagedResponseDto<>(List.of(notificationResponse), 0, 10, 1, 1, false);
        NotificationSettingsResponseDto settingsResponse = new NotificationSettingsResponseDto(true, true, true, true);
        MessageResponseDto messageResponse = new MessageResponseDto("ok");

        when(userProfileService.me(userId)).thenReturn(profileResponse);
        when(userProfileService.updateProfile(userId, updateProfileRequest)).thenReturn(profileResponse);
        when(userProfileService.changePassword(userId, changePasswordRequest)).thenReturn(messageResponse);
        when(userProfileService.uploadAvatar(userId, avatarFile)).thenReturn(avatarResponse);
        when(userProfileService.getNotifications(userId, true, 1, 20)).thenReturn(pageResponse);
        when(userProfileService.markNotificationAsRead(userId, notificationId)).thenReturn(notificationResponse);
        when(userProfileService.markAllNotificationsAsRead(userId)).thenReturn(messageResponse);
        when(userProfileService.getNotificationSettings(userId)).thenReturn(settingsResponse);
        when(userProfileService.updateNotificationSettings(userId, settingsRequest)).thenReturn(settingsResponse);

        assertThat(controller.me(authentication)).isSameAs(profileResponse);
        assertThat(controller.updateProfile(authentication, updateProfileRequest)).isSameAs(profileResponse);
        assertThat(controller.changePassword(authentication, changePasswordRequest)).isSameAs(messageResponse);
        assertThat(controller.uploadAvatar(authentication, avatarFile)).isSameAs(avatarResponse);
        assertThat(controller.notifications(authentication, true, 1, 20)).isSameAs(pageResponse);
        assertThat(controller.markNotificationAsRead(authentication, notificationId)).isSameAs(notificationResponse);
        assertThat(controller.markAllNotificationsAsRead(authentication)).isSameAs(messageResponse);
        assertThat(controller.notificationSettings(authentication)).isSameAs(settingsResponse);
        assertThat(controller.updateNotificationSettings(authentication, settingsRequest)).isSameAs(settingsResponse);

        verify(userProfileService).me(userId);
        verify(userProfileService).updateProfile(userId, updateProfileRequest);
        verify(userProfileService).changePassword(userId, changePasswordRequest);
        verify(userProfileService).uploadAvatar(userId, avatarFile);
        verify(userProfileService).getNotifications(userId, true, 1, 20);
        verify(userProfileService).markNotificationAsRead(userId, notificationId);
        verify(userProfileService).markAllNotificationsAsRead(userId);
        verify(userProfileService).getNotificationSettings(userId);
        verify(userProfileService).updateNotificationSettings(userId, settingsRequest);
    }

    @Test
    void endpoints_throwWhenAuthenticationPrincipalIsInvalid() {
        UserProfileController controller = new UserProfileController(userProfileService);

        assertThatThrownBy(() -> controller.me(null)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> controller.me(new TestingAuthenticationToken("", null))).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> controller.me(new TestingAuthenticationToken("not-a-uuid", null))).isInstanceOf(InvalidCredentialsException.class);
    }
}

