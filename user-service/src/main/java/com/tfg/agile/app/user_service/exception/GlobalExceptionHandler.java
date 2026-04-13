package com.tfg.agile.app.user_service.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.context.MessageSource;
import org.springframework.context.i18n.LocaleContextHolder;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final String INVALID_RESET_TOKEN_MESSAGE_KEY = "auth.reset-password.invalid-token";
    private static final String INVALID_REFRESH_TOKEN_MESSAGE_KEY = "auth.refresh.invalid-token";
    private static final String INVALID_PASSWORD_CHANGE_MESSAGE_KEY = "auth.change-password.invalid";
    private static final String INVALID_GOOGLE_TOKEN_MESSAGE_KEY = "auth.google.invalid-token";
    private static final String GOOGLE_NOT_CONFIGURED_MESSAGE_KEY = "auth.google.not-configured";
    private final MessageSource messageSource;

    public GlobalExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "VALIDATION_ERROR",
                "message", "Invalid request body"
        ));
    }

    @ExceptionHandler(EmailAlreadyExistsException.class)
    public ResponseEntity<?> emailAlreadyExists() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 409,
                "error", "EMAIL_ALREADY_EXISTS",
                "message", "Email already exists"
        ));
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<?> invalidCredentials() {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 401,
                "error", "INVALID_CREDENTIALS",
                "message", "Invalid credentials"
        ));
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<?> userNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 404,
                "error", "USER_NOT_FOUND",
                "message", "User not found"
        ));
    }

    @ExceptionHandler(InvalidPasswordResetTokenException.class)
    public ResponseEntity<?> invalidPasswordResetToken() {
        String message = messageSource.getMessage(
                INVALID_RESET_TOKEN_MESSAGE_KEY,
                null,
                "Invalid or expired password reset token",
                LocaleContextHolder.getLocale()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "INVALID_PASSWORD_RESET_TOKEN",
                "message", message
        ));
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<?> invalidRefreshToken() {
        String message = messageSource.getMessage(
                INVALID_REFRESH_TOKEN_MESSAGE_KEY,
                null,
                "Invalid or expired refresh token",
                LocaleContextHolder.getLocale()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "INVALID_REFRESH_TOKEN",
                "message", message
        ));
    }

    @ExceptionHandler(InvalidPasswordChangeException.class)
    public ResponseEntity<?> invalidPasswordChange() {
        String message = messageSource.getMessage(
                INVALID_PASSWORD_CHANGE_MESSAGE_KEY,
                null,
                "New password must be different from current password",
                LocaleContextHolder.getLocale()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "INVALID_PASSWORD_CHANGE",
                "message", message
        ));
    }

    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<?> notificationNotFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 404,
                "error", "NOTIFICATION_NOT_FOUND",
                "message", "Notification not found"
        ));
    }

    @ExceptionHandler(InvalidGoogleTokenException.class)
    public ResponseEntity<?> invalidGoogleToken() {
        String message = messageSource.getMessage(
                INVALID_GOOGLE_TOKEN_MESSAGE_KEY,
                null,
                "Invalid Google token",
                LocaleContextHolder.getLocale()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "INVALID_GOOGLE_TOKEN",
                "message", message
        ));
    }

    @ExceptionHandler(GoogleLoginNotConfiguredException.class)
    public ResponseEntity<?> googleLoginNotConfigured() {
        String message = messageSource.getMessage(
                GOOGLE_NOT_CONFIGURED_MESSAGE_KEY,
                null,
                "Google login is not configured",
                LocaleContextHolder.getLocale()
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 503,
                "error", "GOOGLE_LOGIN_NOT_CONFIGURED",
                "message", message
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<?> illegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "BAD_REQUEST",
                "message", ex.getMessage() == null ? "Invalid request" : ex.getMessage()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<?> dataIntegrityViolation() {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 409,
                "error", "DATA_INTEGRITY_VIOLATION",
                "message", "Data integrity constraint violated"
        ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<?> responseStatus(ResponseStatusException ex) {
        int status = ex.getStatusCode().value();
        String reason = ex.getReason();
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", status,
                "error", ex.getStatusCode().toString(),
                "message", reason == null || reason.isBlank() ? "Request failed" : reason
        ));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<?> maxUploadSizeExceeded() {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 413,
                "error", "PAYLOAD_TOO_LARGE",
                "message", "Avatar file exceeds maximum allowed size"
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> runtime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 500,
                "error", "INTERNAL_ERROR",
                "message", "Unexpected error"
        ));
    }
}
