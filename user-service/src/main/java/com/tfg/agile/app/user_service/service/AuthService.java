package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.ForgotPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.GoogleLoginRequestDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.RefreshTokenRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.ResetPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.entity.PasswordResetToken;
import com.tfg.agile.app.user_service.entity.RefreshToken;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.exception.EmailAlreadyExistsException;
import com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.exception.InvalidGoogleTokenException;
import com.tfg.agile.app.user_service.exception.InvalidPasswordResetTokenException;
import com.tfg.agile.app.user_service.exception.InvalidRefreshTokenException;
import com.tfg.agile.app.user_service.exception.UserNotFoundException;
import com.tfg.agile.app.user_service.repository.PasswordResetTokenRepository;
import com.tfg.agile.app.user_service.repository.RefreshTokenRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.security.JwtService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Locale;
import java.util.UUID;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final String UNIQUE_EMAIL_CONSTRAINT = "uk_users_email";
    private static final String FORGOT_PASSWORD_NEUTRAL_MESSAGE_KEY = "auth.forgot-password.neutral";
    private static final String RESET_PASSWORD_SUCCESS_MESSAGE_KEY = "auth.reset-password.success";
    private static final String LOGOUT_SUCCESS_MESSAGE_KEY = "auth.logout.success";
    private static final int RESET_TOKEN_BYTES = 32;
    private static final int REFRESH_TOKEN_BYTES = 48;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MessageSource messageSource;
    private final PasswordResetNotifier passwordResetNotifier;
    private final GoogleIdentityService googleIdentityService;
    private final long resetPasswordExpirationMinutes;
    private final long refreshTokenExpirationDays;
    private final String resetPasswordBaseUrl;

    public AuthService(
            UserRepository userRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            MessageSource messageSource,
            PasswordResetNotifier passwordResetNotifier,
            GoogleIdentityService googleIdentityService,
            @org.springframework.beans.factory.annotation.Value("${security.reset-password.expirationMinutes:15}")
            long resetPasswordExpirationMinutes,
            @org.springframework.beans.factory.annotation.Value("${security.refresh-token.expirationDays:7}")
            long refreshTokenExpirationDays,
            @org.springframework.beans.factory.annotation.Value("${security.reset-password.base-url:http://localhost:3000/reset-password}")
            String resetPasswordBaseUrl
    ) {
        this.userRepository = userRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.messageSource = messageSource;
        this.passwordResetNotifier = passwordResetNotifier;
        this.googleIdentityService = googleIdentityService;
        this.resetPasswordExpirationMinutes = resetPasswordExpirationMinutes;
        this.refreshTokenExpirationDays = refreshTokenExpirationDays;
        this.resetPasswordBaseUrl = resetPasswordBaseUrl;
    }

    public AuthResponseDto register(RegisterRequestDto req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new EmailAlreadyExistsException();
        }

        Instant now = Instant.now();
        User user = User.builder()
                .username(req.getUsername())
                .fullName(req.getUsername())
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .hasLocalPassword(true)
                .tokenVersion(0)
                .createdAt(now)
                .updatedAt(now)
                .build();

        User saved;
        try {
            saved = userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            if (isUniqueEmailViolation(ex)) {
                throw new EmailAlreadyExistsException();
            }
            throw ex;
        }

        return issueSession(saved);
    }

    public AuthResponseDto login(LoginRequestDto req) {
        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return issueSession(user);
    }

    @Transactional
    public AuthResponseDto googleLogin(GoogleLoginRequestDto req) {
        GoogleIdentityService.GoogleIdentity identity;
        try {
            identity = googleIdentityService.verifyIdToken(req.getIdToken());
        } catch (GoogleLoginNotConfiguredException | InvalidGoogleTokenException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            throw new InvalidGoogleTokenException();
        }

        User user = userRepository.findByEmail(identity.email()).orElseGet(() -> createGoogleUser(identity));
        boolean changed = false;
        if ((user.getFullName() == null || user.getFullName().isBlank()) && identity.name() != null) {
            user.setFullName(identity.name());
            changed = true;
        }
        if ((user.getAvatarUrl() == null || user.getAvatarUrl().isBlank()) && identity.pictureUrl() != null) {
            user.setAvatarUrl(identity.pictureUrl());
            changed = true;
        }
        if (changed) {
            user.setUpdatedAt(Instant.now());
            userRepository.save(user);
        }

        return issueSession(user);
    }

    @Transactional
    public AuthResponseDto refresh(RefreshTokenRequestDto req) {
        Instant now = Instant.now();
        RefreshToken refreshToken = resolveValidRefreshToken(req.getRefreshToken(), now);
        User user = refreshToken.getUser();

        if (refreshToken.getUserTokenVersion() != user.getTokenVersion()) {
            refreshToken.setRevokedAt(now);
            throw new InvalidRefreshTokenException();
        }

        String newRefreshToken = rotateRefreshToken(refreshToken, user, now);
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getTokenVersion());
        return new AuthResponseDto(accessToken, newRefreshToken, toUserResponse(user));
    }

    @Transactional
    public MessageResponseDto logout(RefreshTokenRequestDto req) {
        Instant now = Instant.now();
        String tokenHash = hashToken(req.getRefreshToken());
        refreshTokenRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(tokenHash, now)
                .ifPresent(token -> token.setRevokedAt(now));

        String message = messageSource.getMessage(
                LOGOUT_SUCCESS_MESSAGE_KEY,
                null,
                "Session closed successfully",
                LocaleContextHolder.getLocale()
        );
        return new MessageResponseDto(message);
    }

    public UserResponseDto me(UUID userIdFromToken) {
        User user = userRepository.findById(userIdFromToken)
                .orElseThrow(UserNotFoundException::new);
        return toUserResponse(user);
    }

    @Transactional
    public MessageResponseDto forgotPassword(ForgotPasswordRequestDto req) {
        userRepository.findByEmail(req.getEmail()).ifPresent(user -> {
            Instant now = Instant.now();
            passwordResetTokenRepository
                    .findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(user.getId(), now)
                    .forEach(token -> token.setUsedAt(now));

            String rawToken = generateResetToken();
            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .user(user)
                    .tokenHash(hashToken(rawToken))
                    .expiresAt(now.plus(resetPasswordExpirationMinutes, ChronoUnit.MINUTES))
                    .createdAt(now)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String resetLink = buildResetLink(rawToken);
            try {
                passwordResetNotifier.sendPasswordReset(user.getEmail(), resetLink);
            } catch (RuntimeException ex) {
                log.error("Failed to send password reset email for user {}", user.getId(), ex);
            }
        });
        String message = messageSource.getMessage(
                FORGOT_PASSWORD_NEUTRAL_MESSAGE_KEY,
                null,
                LocaleContextHolder.getLocale()
        );
        return new MessageResponseDto(message);
    }

    @Transactional
    public MessageResponseDto resetPassword(ResetPasswordRequestDto req) {
        Instant now = Instant.now();
        String tokenHash = hashToken(req.getToken());
        PasswordResetToken resetToken = passwordResetTokenRepository
                .findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(tokenHash, now)
                .orElseThrow(InvalidPasswordResetTokenException::new);

        User user = resetToken.getUser();
        user.setPasswordHash(passwordEncoder.encode(req.getNewPassword()));
        user.setHasLocalPassword(true);
        user.setTokenVersion(user.getTokenVersion() + 1);
        userRepository.save(user);

        passwordResetTokenRepository
                .findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(user.getId(), now)
                .forEach(token -> token.setUsedAt(now));

        refreshTokenRepository
                .findAllByUserIdAndRevokedAtIsNullAndExpiresAtAfter(user.getId(), now)
                .forEach(token -> token.setRevokedAt(now));

        String message = messageSource.getMessage(
                RESET_PASSWORD_SUCCESS_MESSAGE_KEY,
                null,
                "Password has been reset successfully",
                LocaleContextHolder.getLocale()
        );
        return new MessageResponseDto(message);
    }

    private UserResponseDto toUserResponse(User u) {
        return new UserResponseDto(u.getId(), u.getUsername(), u.getEmail(), u.getCreatedAt(), u.isHasLocalPassword());
    }

    private User createGoogleUser(GoogleIdentityService.GoogleIdentity identity) {
        Instant now = Instant.now();
        User user = User.builder()
                .username(buildGoogleUsername(identity))
                .fullName(identity.name() != null ? identity.name() : buildGoogleUsername(identity))
                .email(identity.email())
                .avatarUrl(identity.pictureUrl())
                .passwordHash(passwordEncoder.encode(generateOpaqueToken(REFRESH_TOKEN_BYTES)))
                .hasLocalPassword(false)
                .tokenVersion(0)
                .createdAt(now)
                .updatedAt(now)
                .build();
        try {
            return userRepository.save(user);
        } catch (DataIntegrityViolationException ex) {
            if (isUniqueEmailViolation(ex)) {
                return userRepository.findByEmail(identity.email()).orElseThrow(InvalidCredentialsException::new);
            }
            throw ex;
        }
    }

    private String buildGoogleUsername(GoogleIdentityService.GoogleIdentity identity) {
        String email = identity.email();
        if (email == null || email.isBlank()) {
            return "google-user-" + generateOpaqueToken(6).toLowerCase(Locale.ROOT);
        }
        String localPart = email.split("@", 2)[0].trim();
        if (localPart.isBlank()) {
            return "google-user-" + generateOpaqueToken(6).toLowerCase(Locale.ROOT);
        }
        return localPart;
    }

    private AuthResponseDto issueSession(User user) {
        Instant now = Instant.now();
        String accessToken = jwtService.generateAccessToken(user.getId(), user.getEmail(), user.getTokenVersion());
        String refreshToken = createRefreshToken(user, now);
        return new AuthResponseDto(accessToken, refreshToken, toUserResponse(user));
    }

    private RefreshToken resolveValidRefreshToken(String rawRefreshToken, Instant now) {
        String tokenHash = hashToken(rawRefreshToken);
        return refreshTokenRepository
                .findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(tokenHash, now)
                .orElseThrow(InvalidRefreshTokenException::new);
    }

    private String rotateRefreshToken(RefreshToken currentRefreshToken, User user, Instant now) {
        currentRefreshToken.setRevokedAt(now);
        refreshTokenRepository.save(currentRefreshToken);
        return createRefreshToken(user, now);
    }

    private String createRefreshToken(User user, Instant now) {
        String rawRefreshToken = generateOpaqueToken(REFRESH_TOKEN_BYTES);
        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .tokenHash(hashToken(rawRefreshToken))
                .userTokenVersion(user.getTokenVersion())
                .expiresAt(now.plus(refreshTokenExpirationDays, ChronoUnit.DAYS))
                .createdAt(now)
                .build();
        refreshTokenRepository.save(refreshToken);
        return rawRefreshToken;
    }

    private boolean isUniqueEmailViolation(DataIntegrityViolationException ex) {
        Throwable cause = ex;
        while (cause != null) {
            String message = cause.getMessage();
            if (message != null && message.contains(UNIQUE_EMAIL_CONSTRAINT)) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private String generateResetToken() {
        return generateOpaqueToken(RESET_TOKEN_BYTES);
    }

    private String generateOpaqueToken(int tokenBytes) {
        byte[] bytes = new byte[tokenBytes];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String rawToken) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] digest = messageDigest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 algorithm not available", ex);
        }
    }

    private String buildResetLink(String rawToken) {
        String encodedToken = URLEncoder.encode(rawToken, StandardCharsets.UTF_8);
        return resetPasswordBaseUrl + "?token=" + encodedToken;
    }
}
