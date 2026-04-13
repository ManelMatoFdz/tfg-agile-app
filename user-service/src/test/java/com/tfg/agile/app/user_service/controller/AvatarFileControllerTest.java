package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.service.AvatarStorageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AvatarFileControllerTest {

    @Mock
    private AvatarStorageService avatarStorageService;

    @Test
    void getAvatar_returnsFileWithExpectedHeaders() {
        AvatarFileController controller = new AvatarFileController(avatarStorageService);
        UUID userId = UUID.randomUUID();

        when(avatarStorageService.load(userId))
                .thenReturn(Optional.of(new AvatarStorageService.StoredAvatar(new byte[]{1, 2}, "image/png")));

        ResponseEntity<byte[]> response = controller.getAvatar(userId);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getHeaders().getFirst("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeaders().getContentType().toString()).isEqualTo("image/png");
    }

    @Test
    void getAvatar_throws404WhenMissing() {
        AvatarFileController controller = new AvatarFileController(avatarStorageService);
        UUID userId = UUID.randomUUID();

        when(avatarStorageService.load(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> controller.getAvatar(userId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("404");
    }
}

