package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DtoMappingTest {

    @Test
    void taskResponseDto_from_mapsAllFields() {
        Instant now = Instant.now();
        Task task = Task.builder()
                .id(UUID.randomUUID())
                .projectId(UUID.randomUUID())
                .sprintId(UUID.randomUUID())
                .title("Task")
                .description("Desc")
                .status(TaskStatus.IN_PROGRESS)
                .priority(TaskPriority.HIGH)
                .reporterId(UUID.randomUUID())
                .assigneeId(UUID.randomUUID())
                .storyPoints(8)
                .position(2)
                .createdAt(now)
                .updatedAt(now)
                .build();

        TaskResponseDto dto = TaskResponseDto.from(task);

        assertThat(dto.id()).isEqualTo(task.getId());
        assertThat(dto.projectId()).isEqualTo(task.getProjectId());
        assertThat(dto.status()).isEqualTo(TaskStatus.IN_PROGRESS);
        assertThat(dto.priority()).isEqualTo(TaskPriority.HIGH);
        assertThat(dto.storyPoints()).isEqualTo(8);
    }

    @Test
    void sprintResponseDto_from_mapsAllFields() {
        Instant now = Instant.now();
        Sprint sprint = Sprint.builder()
                .id(UUID.randomUUID())
                .projectId(UUID.randomUUID())
                .name("Sprint 1")
                .goal("Goal")
                .status(SprintStatus.ACTIVE)
                .startDate(LocalDate.now())
                .endDate(LocalDate.now().plusDays(14))
                .createdAt(now)
                .updatedAt(now)
                .build();

        SprintResponseDto dto = SprintResponseDto.from(sprint);

        assertThat(dto.id()).isEqualTo(sprint.getId());
        assertThat(dto.projectId()).isEqualTo(sprint.getProjectId());
        assertThat(dto.status()).isEqualTo(SprintStatus.ACTIVE);
        assertThat(dto.goal()).isEqualTo("Goal");
    }
}

