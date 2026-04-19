package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.ForgotPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.GoogleLoginRequestDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.RefreshTokenRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.ResetPasswordRequestDto;
import com.tfg.agile.app.user_service.entity.PasswordResetToken;
import com.tfg.agile.app.user_service.entity.RefreshToken;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.exception.EmailAlreadyExistsException;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.exception.InvalidGoogleTokenException;
import com.tfg.agile.app.user_service.exception.InvalidPasswordResetTokenException;
import com.tfg.agile.app.user_service.exception.InvalidRefreshTokenException;
import com.tfg.agile.app.user_service.repository.PasswordResetTokenRepository;
import com.tfg.agile.app.user_service.repository.RefreshTokenRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.security.JwtService;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;
    @Mock
    private MessageSource messageSource;
    @Mock
    private PasswordResetNotifier passwordResetNotifier;
    @Mock
    private GoogleIdentityService googleIdentityService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userRepository,
                passwordResetTokenRepository,
                refreshTokenRepository,
                passwordEncoder,
                jwtService,
                messageSource,
                passwordResetNotifier,
                googleIdentityService,
                15,
                7,
                "http://localhost:3000/reset-password"
        );
    }

    @Test
    void register_createsUserAndSession() {
        RegisterRequestDto req = new RegisterRequestDto("john", "john@example.com", "secret123");
        User savedUser = TestDataFactory.user();
        savedUser.setEmail(req.getEmail());
        savedUser.setUsername(req.getUsername());

        when(userRepository.existsByEmail(req.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(req.getPassword())).thenReturn("encoded");
        when(userRepository.save(any(User.class))).thenReturn(savedUser);
        when(jwtService.generateAccessToken(savedUser.getId(), savedUser.getEmail(), savedUser.getTokenVersion()))
                .thenReturn("access-token");

        AuthResponseDto response = authService.register(req);

        assertThat(response.getAccessToken()).isEqualTo("access-token");
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getUser().getEmail()).isEqualTo("john@example.com");
        verify(refreshTokenRepository).save(any(RefreshToken.class));
    }

    @Test
    void register_throwsWhenEmailAlreadyExists() {
        RegisterRequestDto req = new RegisterRequestDto("john", "john@example.com", "secret123");
        when(userRepository.existsByEmail(req.getEmail())).thenReturn(true);

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void register_translatesUniqueConstraintViolation() {
        RegisterRequestDto req = new RegisterRequestDto("john", "john@example.com", "secret123");
        when(userRepository.existsByEmail(req.getEmail())).thenReturn(false);
        when(passwordEncoder.encode(req.getPassword())).thenReturn("encoded");
        when(userRepository.save(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key uk_users_email"));

        assertThatThrownBy(() -> authService.register(req))
                .isInstanceOf(EmailAlreadyExistsException.class);
    }

    @Test
    void login_failsWhenUserDoesNotExist() {
        when(userRepository.findByEmail("john@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequestDto("john@example.com", "secret123")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void login_failsWhenPasswordDoesNotMatch() {
        User user = TestDataFactory.user();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("bad-password", user.getPasswordHash())).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequestDto(user.getEmail(), "bad-password")))
                .isInstanceOf(InvalidCredentialsException.class);
    }

    @Test
    void refresh_rotatesRefreshTokenAndReturnsNewSession() {
        User user = TestDataFactory.user();
        user.setTokenVersion(3);
        RefreshToken currentRefreshToken = TestDataFactory.refreshToken(user);
        currentRefreshToken.setUserTokenVersion(3);

        when(refreshTokenRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(currentRefreshToken));
        when(jwtService.generateAccessToken(user.getId(), user.getEmail(), 3)).thenReturn("new-access");

        AuthResponseDto response = authService.refresh(new RefreshTokenRequestDto("raw-refresh"));

        assertThat(response.getAccessToken()).isEqualTo("new-access");
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(currentRefreshToken.getRevokedAt()).isNotNull();
        verify(refreshTokenRepository).save(currentRefreshToken);
    }

    @Test
    void refresh_failsWhenTokenVersionDoesNotMatch() {
        User user = TestDataFactory.user();
        user.setTokenVersion(5);
        RefreshToken currentRefreshToken = TestDataFactory.refreshToken(user);
        currentRefreshToken.setUserTokenVersion(4);

        when(refreshTokenRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(currentRefreshToken));

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequestDto("raw-refresh")))
                .isInstanceOf(InvalidRefreshTokenException.class);

        assertThat(currentRefreshToken.getRevokedAt()).isNotNull();
        verify(jwtService, never()).generateAccessToken(any(), anyString(), anyInt());
    }

    @Test
    void forgotPassword_whenUserExists_generatesTokenAndNotifies() {
        User user = TestDataFactory.user();
        PasswordResetToken existing = TestDataFactory.passwordResetToken(user);

        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of(existing));
        when(messageSource.getMessage(anyString(), any(), any(java.util.Locale.class))).thenReturn("ok");

        MessageResponseDto response = authService.forgotPassword(new ForgotPasswordRequestDto(user.getEmail()));

        assertThat(response.getMessage()).isEqualTo("ok");
        assertThat(existing.getUsedAt()).isNotNull();

        ArgumentCaptor<PasswordResetToken> tokenCaptor = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(passwordResetTokenRepository).save(tokenCaptor.capture());
        PasswordResetToken savedToken = tokenCaptor.getValue();
        assertThat(savedToken.getTokenHash()).isNotBlank();
        verify(passwordResetNotifier).sendPasswordReset(anyString(), anyString());
    }

    @Test
    void forgotPassword_whenUserIsMissing_returnsNeutralResponse() {
        when(userRepository.findByEmail("missing@example.com")).thenReturn(Optional.empty());
        when(messageSource.getMessage(anyString(), any(), any(java.util.Locale.class))).thenReturn("ok");

        MessageResponseDto response = authService.forgotPassword(new ForgotPasswordRequestDto("missing@example.com"));

        assertThat(response.getMessage()).isEqualTo("ok");
        verify(passwordResetTokenRepository, never()).save(any());
        verify(passwordResetNotifier, never()).sendPasswordReset(anyString(), anyString());
    }

    @Test
    void resetPassword_updatesPasswordAndRevokesTokens() {
        User user = TestDataFactory.user();
        user.setTokenVersion(1);
        PasswordResetToken resetToken = TestDataFactory.passwordResetToken(user);
        PasswordResetToken secondResetToken = TestDataFactory.passwordResetToken(user);
        RefreshToken refreshToken = TestDataFactory.refreshToken(user);

        when(passwordResetTokenRepository.findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(resetToken));
        when(passwordResetTokenRepository.findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of(resetToken, secondResetToken));
        when(refreshTokenRepository.findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of(refreshToken));
        when(passwordEncoder.encode("new-secret")).thenReturn("encoded-new");
        when(messageSource.getMessage(anyString(), any(), anyString(), any(java.util.Locale.class))).thenReturn("ok");

        MessageResponseDto response = authService.resetPassword(new ResetPasswordRequestDto("raw-token", "new-secret"));

        assertThat(response.getMessage()).isEqualTo("ok");
        assertThat(user.getPasswordHash()).isEqualTo("encoded-new");
        assertThat(user.isHasLocalPassword()).isTrue();
        assertThat(user.getTokenVersion()).isEqualTo(2);
        assertThat(resetToken.getUsedAt()).isNotNull();
        assertThat(secondResetToken.getUsedAt()).isNotNull();
        assertThat(refreshToken.getRevokedAt()).isNotNull();
    }

    @Test
    void resetPassword_failsWithInvalidToken() {
        when(passwordResetTokenRepository.findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.resetPassword(new ResetPasswordRequestDto("bad", "new-secret")))
                .isInstanceOf(InvalidPasswordResetTokenException.class);
    }

    @Test
    void googleLogin_createsUserWhenMissing() {
        GoogleIdentityService.GoogleIdentity identity = new GoogleIdentityService.GoogleIdentity(
                "sub-id",
                "google@example.com",
                "Google User",
                "https://img.example.com/avatar.png"
        );
        User created = TestDataFactory.user();
        created.setEmail(identity.email());
        created.setFullName(identity.name());
        created.setAvatarUrl(identity.pictureUrl());
        created.setHasLocalPassword(false);

        when(googleIdentityService.verifyIdToken("id-token")).thenReturn(identity);
        when(userRepository.findByEmail(identity.email())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("opaque-pass");
        when(userRepository.save(any(User.class))).thenReturn(created);
        when(jwtService.generateAccessToken(created.getId(), created.getEmail(), created.getTokenVersion()))
                .thenReturn("google-access");

        AuthResponseDto response = authService.googleLogin(new GoogleLoginRequestDto("id-token"));

        assertThat(response.getAccessToken()).isEqualTo("google-access");
        assertThat(response.getUser().isHasLocalPassword()).isFalse();
    }

    @Test
    void googleLogin_updatesFieldsOnlyWhenMissing() {
        GoogleIdentityService.GoogleIdentity identity = new GoogleIdentityService.GoogleIdentity(
                "sub-id",
                "john@example.com",
                "John Doe",
                "https://img.example.com/avatar.png"
        );
        User existing = TestDataFactory.user();
        existing.setFullName(" ");
        existing.setAvatarUrl(null);

        when(googleIdentityService.verifyIdToken("id-token")).thenReturn(identity);
        when(userRepository.findByEmail(identity.email())).thenReturn(Optional.of(existing));
        when(jwtService.generateAccessToken(existing.getId(), existing.getEmail(), existing.getTokenVersion()))
                .thenReturn("google-access");

        authService.googleLogin(new GoogleLoginRequestDto("id-token"));

        assertThat(existing.getFullName()).isEqualTo("John Doe");
        assertThat(existing.getAvatarUrl()).isEqualTo("https://img.example.com/avatar.png");
        verify(userRepository).save(existing);
    }

    @Test
    void googleLogin_mapsUnexpectedErrors() {
        when(googleIdentityService.verifyIdToken("id-token")).thenThrow(new RuntimeException("boom"));

        assertThatThrownBy(() -> authService.googleLogin(new GoogleLoginRequestDto("id-token")))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void logout_revokesTokenWhenPresentAndReturnsMessage() {
        User user = TestDataFactory.user();
        RefreshToken activeToken = TestDataFactory.refreshToken(user);

        when(refreshTokenRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.of(activeToken));
        when(messageSource.getMessage(anyString(), any(), anyString(), any(java.util.Locale.class))).thenReturn("session closed");

        MessageResponseDto response = authService.logout(new RefreshTokenRequestDto("raw-refresh"));

        assertThat(response.getMessage()).isEqualTo("session closed");
        assertThat(activeToken.getRevokedAt()).isNotNull();
    }

    @Test
    void logout_whenTokenIsMissingStillReturnsMessage() {
        when(refreshTokenRepository.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(anyString(), any(Instant.class)))
                .thenReturn(Optional.empty());
        when(messageSource.getMessage(anyString(), any(), anyString(), any(java.util.Locale.class))).thenReturn("session closed");

        MessageResponseDto response = authService.logout(new RefreshTokenRequestDto("raw-refresh"));

        assertThat(response.getMessage()).isEqualTo("session closed");
    }

    @Test
    void me_throwsWhenUserDoesNotExist() {
        when(userRepository.findById(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.me(java.util.UUID.randomUUID()))
                .isInstanceOf(com.tfg.agile.app.user_service.exception.UserNotFoundException.class);
    }

    @Test
    void forgotPassword_whenNotifierFails_returnsNeutralResponse() {
        User user = TestDataFactory.user();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(passwordResetTokenRepository.findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(any(), any(Instant.class)))
                .thenReturn(List.of());
        org.mockito.Mockito.doThrow(new RuntimeException("smtp down"))
                .when(passwordResetNotifier).sendPasswordReset(anyString(), anyString());
        when(messageSource.getMessage(anyString(), any(), any(java.util.Locale.class))).thenReturn("ok");

        MessageResponseDto response = authService.forgotPassword(new ForgotPasswordRequestDto(user.getEmail()));

        assertThat(response.getMessage()).isEqualTo("ok");
        verify(passwordResetNotifier).sendPasswordReset(anyString(), anyString());
    }

    @Test
    void googleLogin_propagatesNotConfiguredException() {
        when(googleIdentityService.verifyIdToken("id-token"))
                .thenThrow(new com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException());

        assertThatThrownBy(() -> authService.googleLogin(new GoogleLoginRequestDto("id-token")))
                .isInstanceOf(com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException.class);
    }

    @Test
    void googleLogin_onUniqueConstraintFetchesExistingUser() {
        GoogleIdentityService.GoogleIdentity identity = new GoogleIdentityService.GoogleIdentity(
                "sub-id",
                "google@example.com",
                "Google User",
                null
        );
        User existing = TestDataFactory.user();
        existing.setEmail(identity.email());

        when(googleIdentityService.verifyIdToken("id-token")).thenReturn(identity);
        when(userRepository.findByEmail(identity.email())).thenReturn(Optional.empty(), Optional.of(existing));
        when(passwordEncoder.encode(anyString())).thenReturn("opaque-pass");
        when(userRepository.save(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate", new RuntimeException("uk_users_email")));
        when(jwtService.generateAccessToken(existing.getId(), existing.getEmail(), existing.getTokenVersion()))
                .thenReturn("google-access");

        AuthResponseDto response = authService.googleLogin(new GoogleLoginRequestDto("id-token"));

        assertThat(response.getAccessToken()).isEqualTo("google-access");
        assertThat(response.getUser().getEmail()).isEqualTo(identity.email());
    }
}
