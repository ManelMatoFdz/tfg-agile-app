package com.tfg.agile.app.user_service.repository;

import com.tfg.agile.app.user_service.entity.Notification;
import com.tfg.agile.app.user_service.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class NotificationRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    void unreadQueriesAndMarkAllAsReadUseDatabaseState() {
        User user = userRepository.save(User.builder()
                .username("ada")
                .email("ada@example.com")
                .passwordHash("hash")
                .hasLocalPassword(true)
                .tokenVersion(0)
                .build());

        notificationRepository.save(Notification.builder()
                .user(user)
                .title("Unread 1")
                .message("Message")
                .type("TASK_REMINDER")
                .isRead(false)
                .createdAt(Instant.now().minusSeconds(120))
                .build());
        notificationRepository.save(Notification.builder()
                .user(user)
                .title("Read")
                .message("Message")
                .type("TASK_REMINDER")
                .isRead(true)
                .createdAt(Instant.now().minusSeconds(60))
                .build());
        notificationRepository.save(Notification.builder()
                .user(user)
                .title("Unread 2")
                .message("Message")
                .type("PROJECT_UPDATE")
                .isRead(false)
                .createdAt(Instant.now())
                .build());

        assertThat(notificationRepository.findByUserIdAndIsReadFalse(user.getId(), PageRequest.of(0, 10)))
                .extracting(Notification::getTitle)
                .containsExactlyInAnyOrder("Unread 1", "Unread 2");

        int updated = notificationRepository.markAllAsRead(user.getId());

        assertThat(updated).isEqualTo(2);
        assertThat(notificationRepository.findByUserIdAndIsReadFalse(user.getId(), PageRequest.of(0, 10)))
                .isEmpty();
    }
}
