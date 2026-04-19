package com.tfg.agile.app.user_service.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private MessageSource messageSource;

    @Test
    void validation_returnsBadRequestBody() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.validation(mock(MethodArgumentNotValidException.class));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void invalidRefreshToken_returnsBadRequestWithTranslatedMessage() {
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Invalid refresh token");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.invalidRefreshToken();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INVALID_REFRESH_TOKEN");
        assertThat(body.get("message")).isEqualTo("Invalid refresh token");
    }

    @Test
    void invalidPasswordResetToken_usesTranslatedMessage() {
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Invalid reset token");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.invalidPasswordResetToken();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INVALID_PASSWORD_RESET_TOKEN");
        assertThat(body.get("message")).isEqualTo("Invalid reset token");
    }

    @Test
    void invalidPasswordChange_usesTranslatedMessage() {
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Password cannot be reused");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.invalidPasswordChange();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INVALID_PASSWORD_CHANGE");
        assertThat(body.get("message")).isEqualTo("Password cannot be reused");
    }

    @Test
    void invalidGoogleToken_usesTranslatedMessage() {
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Invalid Google token");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.invalidGoogleToken();

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INVALID_GOOGLE_TOKEN");
    }

    @Test
    void googleLoginNotConfigured_returnsServiceUnavailable() {
        when(messageSource.getMessage(anyString(), any(), anyString(), any(Locale.class)))
                .thenReturn("Google login not configured");
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.googleLoginNotConfigured();

        assertThat(response.getStatusCode().value()).isEqualTo(503);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("GOOGLE_LOGIN_NOT_CONFIGURED");
    }

    @Test
    void emailAlreadyExists_returnsConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.emailAlreadyExists();

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("EMAIL_ALREADY_EXISTS");
    }

    @Test
    void invalidCredentials_returnsUnauthorized() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.invalidCredentials();

        assertThat(response.getStatusCode().value()).isEqualTo(401);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INVALID_CREDENTIALS");
    }

    @Test
    void userNotFound_returnsNotFound() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.userNotFound();

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("USER_NOT_FOUND");
    }

    @Test
    void notificationNotFound_returnsNotFound() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.notificationNotFound();

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("NOTIFICATION_NOT_FOUND");
    }

    @Test
    void dataIntegrityViolation_returnsConflict() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.dataIntegrityViolation();

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("DATA_INTEGRITY_VIOLATION");
    }

    @Test
    void responseStatus_returnsExpectedStatusAndMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.responseStatus(new ResponseStatusException(HttpStatus.NOT_FOUND, "Avatar not found"));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("status")).isEqualTo(404);
        assertThat(body.get("message")).isEqualTo("Avatar not found");
    }

    @Test
    void responseStatus_usesDefaultMessageWhenReasonMissing() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.responseStatus(new ResponseStatusException(HttpStatus.BAD_GATEWAY));

        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("message")).isEqualTo("Request failed");
    }

    @Test
    void illegalArgument_withoutMessage_usesDefaultMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.illegalArgument(new IllegalArgumentException());

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("BAD_REQUEST");
        assertThat(body.get("message")).isEqualTo("Invalid request");
    }

    @Test
    void maxUploadSizeExceeded_returnsPayloadTooLarge() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.maxUploadSizeExceeded();

        assertThat(response.getStatusCode().value()).isEqualTo(413);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("PAYLOAD_TOO_LARGE");
    }

    @Test
    void runtime_returnsInternalError() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.runtime(new RuntimeException("boom"));

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("error")).isEqualTo("INTERNAL_ERROR");
    }
}
