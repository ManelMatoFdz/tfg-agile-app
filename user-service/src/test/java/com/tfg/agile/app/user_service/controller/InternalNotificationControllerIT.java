package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.repository.NotificationRepository;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class InternalNotificationControllerIT extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void enqueueRejectsMissingInternalApiKey() {
        NotificationEnqueueRequestDto request = new NotificationEnqueueRequestDto(
                UUID.randomUUID(),
                "Title",
                "Message",
                "TASK_REMINDER",
                "/board",
                null,
                null
        );

        ResponseEntity<String> response = restTemplate.postForEntity(
                "/internal/notifications/enqueue",
                request,
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void enqueuePublishesToRabbitAndPersistsNotification() throws InterruptedException {
        User user = userRepository.save(User.builder()
                .username("ada")
                .email("ada@example.com")
                .passwordHash("hash")
                .hasLocalPassword(true)
                .tokenVersion(0)
                .build());

        NotificationEnqueueRequestDto request = new NotificationEnqueueRequestDto(
                user.getId(),
                "Repo activity",
                "A new commit was linked",
                "TASK_REMINDER",
                "/workspaces/ws/projects/prj/repository",
                "{\"source\":\"git\"}",
                UUID.randomUUID()
        );

        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Internal-Api-Key", "test-internal-key");

        ResponseEntity<String> response = restTemplate.exchange(
                "/internal/notifications/enqueue",
                HttpMethod.POST,
                new HttpEntity<>(request, headers),
                String.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertNotificationPersisted(user.getId(), request.getActorUserId());
    }

    private void assertNotificationPersisted(UUID userId, UUID actorUserId) throws InterruptedException {
        Instant deadline = Instant.now().plus(Duration.ofSeconds(10));
        while (Instant.now().isBefore(deadline)) {
            var notifications = notificationRepository.findByUserId(userId, org.springframework.data.domain.PageRequest.of(0, 10))
                    .getContent();
            if (!notifications.isEmpty()) {
                var saved = notifications.getFirst();
                assertThat(saved.getTitle()).isEqualTo("Repo activity");
                assertThat(saved.getMessage()).isEqualTo("A new commit was linked");
                assertThat(saved.getType()).isEqualTo("TASK_REMINDER");
                assertThat(saved.getLink()).isEqualTo("/workspaces/ws/projects/prj/repository");
                assertThat(saved.getData()).contains("\"source\":\"git\"");
                assertThat(saved.getData()).contains("\"actorUserId\":\"" + actorUserId + "\"");
                return;
            }
            Thread.sleep(100);
        }
        throw new AssertionError("Notification was not persisted before timeout");
    }
}
