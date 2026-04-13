package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.entity.UserAvatar;
import com.tfg.agile.app.user_service.repository.UserAvatarRepository;
import com.tfg.agile.app.user_service.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DatabaseAvatarStorageServiceTest {

    @Mock
    private UserAvatarRepository userAvatarRepository;

    @Test
    void store_rejectsEmptyFile() {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars");
        User user = TestDataFactory.user();
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{});

        assertThatThrownBy(() -> service.store(user, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("empty");
    }

    @Test
    void store_rejectsTooLargeFile() {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars");
        User user = TestDataFactory.user();
        byte[] large = new byte[(5 * 1024 * 1024) + 1];
        large[0] = (byte) 0xFF;
        large[1] = (byte) 0xD8;
        large[2] = (byte) 0xFF;
        MockMultipartFile file = new MockMultipartFile("file", "avatar.jpg", "image/jpeg", large);

        assertThatThrownBy(() -> service.store(user, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("maximum allowed size");
    }

    @Test
    void store_rejectsUnsupportedType() {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars");
        User user = TestDataFactory.user();
        MockMultipartFile file = new MockMultipartFile("file", "avatar.txt", "text/plain", "hello".getBytes());

        assertThatThrownBy(() -> service.store(user, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unsupported avatar file type");
    }

    @Test
    void store_rejectsMismatchedDeclaredContentType() {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars");
        User user = TestDataFactory.user();
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/jpeg", png);

        assertThatThrownBy(() -> service.store(user, file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("does not match");
    }

    @Test
    void store_detectsRealTypeAndPersistsAvatar() throws Exception {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars/");
        User user = TestDataFactory.user();
        byte[] png = new byte[]{(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00};
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", png);

        when(userAvatarRepository.findByUserId(user.getId())).thenReturn(Optional.empty());

        String publicUrl = service.store(user, file);

        ArgumentCaptor<UserAvatar> captor = ArgumentCaptor.forClass(UserAvatar.class);
        verify(userAvatarRepository).save(captor.capture());
        UserAvatar saved = captor.getValue();
        assertThat(saved.getContentType()).isEqualTo("image/png");
        assertThat(saved.getImageData()).isEqualTo(png);
        assertThat(publicUrl).isEqualTo("http://localhost:8081/assets/avatars/" + user.getId());
    }

    @Test
    void load_returnsAvatarWhenPresent() {
        DatabaseAvatarStorageService service = new DatabaseAvatarStorageService(userAvatarRepository, "http://localhost:8081/assets/avatars");
        User user = TestDataFactory.user();
        UserAvatar avatar = TestDataFactory.userAvatar(user, new byte[]{1, 2, 3}, "image/png");

        when(userAvatarRepository.findByUserId(user.getId())).thenReturn(Optional.of(avatar));

        Optional<AvatarStorageService.StoredAvatar> stored = service.load(user.getId());

        assertThat(stored).isPresent();
        assertThat(stored.get().contentType()).isEqualTo("image/png");
        assertThat(stored.get().content()).containsExactly(1, 2, 3);
    }
}

