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
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/users/me")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public UserProfileResponseDto me(Authentication authentication) {
        return userProfileService.me(userId(authentication));
    }

    @PatchMapping
    public UserProfileResponseDto updateProfile(Authentication authentication, @RequestBody @Valid UpdateUserProfileRequestDto req) {
        return userProfileService.updateProfile(userId(authentication), req);
    }

    @PatchMapping("/password")
    public MessageResponseDto changePassword(Authentication authentication, @RequestBody @Valid ChangePasswordRequestDto req) {
        return userProfileService.changePassword(userId(authentication), req);
    }

    @PostMapping("/avatar")
    public AvatarUploadResponseDto uploadAvatar(Authentication authentication, @RequestParam("file") MultipartFile file) {
        return userProfileService.uploadAvatar(userId(authentication), file);
    }

    @GetMapping("/notifications")
    public PagedResponseDto<NotificationResponseDto> notifications(
            Authentication authentication,
            @RequestParam(name = "unreadOnly", required = false) Boolean unreadOnly,
            @RequestParam(name = "page", required = false) Integer page,
            @RequestParam(name = "size", required = false) Integer size
    ) {
        return userProfileService.getNotifications(userId(authentication), unreadOnly, page, size);
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public NotificationResponseDto markNotificationAsRead(
            Authentication authentication,
            @PathVariable UUID notificationId
    ) {
        return userProfileService.markNotificationAsRead(userId(authentication), notificationId);
    }

    @PostMapping("/notifications/read-all")
    public MessageResponseDto markAllNotificationsAsRead(Authentication authentication) {
        return userProfileService.markAllNotificationsAsRead(userId(authentication));
    }

    @GetMapping("/notifications/settings")
    public NotificationSettingsResponseDto notificationSettings(Authentication authentication) {
        return userProfileService.getNotificationSettings(userId(authentication));
    }

    @PatchMapping("/notifications/settings")
    public NotificationSettingsResponseDto updateNotificationSettings(
            Authentication authentication,
            @RequestBody @Valid UpdateNotificationSettingsRequestDto req
    ) {
        return userProfileService.updateNotificationSettings(userId(authentication), req);
    }

    private UUID userId(Authentication authentication) {
        Object principal = authentication == null ? null : authentication.getPrincipal();
        if (!(principal instanceof String userIdValue) || userIdValue.isBlank()) {
            throw new InvalidCredentialsException();
        }
        try {
            return UUID.fromString(userIdValue);
        } catch (IllegalArgumentException ex) {
            throw new InvalidCredentialsException();
        }
    }
}
