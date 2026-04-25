package com.tfg.agile.app.task_service.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EntityLifecycleTest {

    @Test
    void task_prePersist_setsTimestamps() {
        Task task = Task.builder()
                .projectId(UUID.randomUUID())
                .title("Task")
                .reporterId(UUID.randomUUID())
                .build();

        task.prePersist();

        assertThat(task.getCreatedAt()).isNotNull();
        assertThat(task.getUpdatedAt()).isEqualTo(task.getCreatedAt());
    }

    @Test
    void task_preUpdate_refreshesUpdatedAt() {
        Task task = Task.builder()
                .projectId(UUID.randomUUID())
                .title("Task")
                .reporterId(UUID.randomUUID())
                .build();
        Instant oldUpdatedAt = Instant.now().minusSeconds(60);
        task.setUpdatedAt(oldUpdatedAt);

        task.preUpdate();

        assertThat(task.getUpdatedAt()).isAfter(oldUpdatedAt);
    }

    @Test
    void sprint_prePersist_setsTimestamps() {
        Sprint sprint = Sprint.builder()
                .projectId(UUID.randomUUID())
                .name("Sprint")
                .build();

        sprint.prePersist();

        assertThat(sprint.getCreatedAt()).isNotNull();
        assertThat(sprint.getUpdatedAt()).isEqualTo(sprint.getCreatedAt());
    }

    @Test
    void sprint_preUpdate_refreshesUpdatedAt() {
        Sprint sprint = Sprint.builder()
                .projectId(UUID.randomUUID())
                .name("Sprint")
                .build();
        Instant oldUpdatedAt = Instant.now().minusSeconds(60);
        sprint.setUpdatedAt(oldUpdatedAt);

        sprint.preUpdate();

        assertThat(sprint.getUpdatedAt()).isAfter(oldUpdatedAt);
    }
}

