package com.tfg.agile.app.user_service.exception;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GlobalExceptionHandlerTest {

    @Mock
    private MessageSource messageSource;

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
    void responseStatus_returnsExpectedStatusAndMessage() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler(messageSource);

        ResponseEntity<?> response = handler.responseStatus(new ResponseStatusException(HttpStatus.NOT_FOUND, "Avatar not found"));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        Map<?, ?> body = (Map<?, ?>) response.getBody();
        assertThat(body.get("status")).isEqualTo(404);
        assertThat(body.get("message")).isEqualTo("Avatar not found");
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
}

