package com.tfg.agile.app.task_service.repository;

import com.tfg.agile.app.task_service.FlywayMigrationConfig;
import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitEventType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(FlywayMigrationConfig.class)
class GitEventRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private GitEventRepository gitEventRepository;

    @Test
    void repositoryOrdersEventsAndFindsByUniqueExternalKey() {
        UUID taskId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();

        gitEventRepository.save(GitEvent.builder()
                .taskId(taskId)
                .projectId(projectId)
                .type(GitEventType.COMMIT)
                .externalId("sha-1")
                .externalUrl("https://example.com/1")
                .title("Older commit")
                .author("ada")
                .receivedAt(Instant.now().minusSeconds(30))
                .build());
        GitEvent latest = gitEventRepository.save(GitEvent.builder()
                .taskId(taskId)
                .projectId(projectId)
                .type(GitEventType.PULL_REQUEST)
                .externalId("17")
                .externalUrl("https://example.com/pr/17")
                .title("Newest PR")
                .author("ada")
                .status("open")
                .receivedAt(Instant.now())
                .build());

        assertThat(gitEventRepository.findByTaskIdOrderByReceivedAtDesc(taskId))
                .extracting(GitEvent::getTitle)
                .containsExactly("Newest PR", "Older commit");
        assertThat(gitEventRepository.findByProjectIdAndTypeAndExternalId(projectId, GitEventType.PULL_REQUEST, "17"))
                .contains(latest);
    }
}
