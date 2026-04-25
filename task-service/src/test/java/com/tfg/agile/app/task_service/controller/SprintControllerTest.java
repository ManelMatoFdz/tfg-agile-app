package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.AssignTaskToSprintRequestDto;
import com.tfg.agile.app.task_service.dto.CreateSprintRequestDto;
import com.tfg.agile.app.task_service.dto.SprintResponseDto;
import com.tfg.agile.app.task_service.dto.TaskResponseDto;
import com.tfg.agile.app.task_service.dto.UpdateSprintRequestDto;
import com.tfg.agile.app.task_service.entity.SprintStatus;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.service.SprintService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SprintControllerTest {

    @Mock
    private SprintService sprintService;

    @Test
    void endpoints_delegateToSprintService() {
        SprintController controller = new SprintController(sprintService);
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID sprintId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        CreateSprintRequestDto createRequest = new CreateSprintRequestDto("Sprint", "Goal", LocalDate.now(), LocalDate.now().plusDays(14));
        UpdateSprintRequestDto updateRequest = new UpdateSprintRequestDto("Sprint 2", "Goal 2", LocalDate.now(), LocalDate.now().plusDays(7));
        AssignTaskToSprintRequestDto assignRequest = new AssignTaskToSprintRequestDto(List.of(taskId));

        SprintResponseDto sprintResponse = new SprintResponseDto(
                sprintId, projectId, "Sprint", "Goal", SprintStatus.PLANNING,
                LocalDate.now(), LocalDate.now().plusDays(14), Instant.now(), Instant.now()
        );

        TaskResponseDto taskResponse = new TaskResponseDto(
                taskId, projectId, sprintId, "Task", "Desc", TaskStatus.TODO, TaskPriority.MEDIUM,
                callerId, null, 3, 0, Instant.now(), Instant.now()
        );

        when(sprintService.getBacklog(projectId, callerId)).thenReturn(List.of(taskResponse));
        when(sprintService.listSprints(projectId, callerId)).thenReturn(List.of(sprintResponse));
        when(sprintService.getSprint(sprintId, callerId)).thenReturn(sprintResponse);
        when(sprintService.getSprintTasks(sprintId, callerId)).thenReturn(List.of(taskResponse));
        when(sprintService.createSprint(projectId, createRequest, callerId)).thenReturn(sprintResponse);
        when(sprintService.updateSprint(sprintId, updateRequest, callerId)).thenReturn(sprintResponse);
        when(sprintService.activateSprint(sprintId, callerId)).thenReturn(sprintResponse);
        when(sprintService.completeSprint(sprintId, callerId)).thenReturn(sprintResponse);
        when(sprintService.assignTasksToSprint(sprintId, assignRequest, callerId)).thenReturn(List.of(taskResponse));
        when(sprintService.removeTaskFromSprint(sprintId, taskId, callerId)).thenReturn(taskResponse);

        assertThat(controller.getBacklog(projectId, callerId)).hasSize(1);
        assertThat(controller.listSprints(projectId, callerId)).hasSize(1);
        assertThat(controller.getSprint(sprintId, callerId)).isEqualTo(sprintResponse);
        assertThat(controller.getSprintTasks(sprintId, callerId)).hasSize(1);
        assertThat(controller.createSprint(projectId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.updateSprint(sprintId, updateRequest, callerId)).isEqualTo(sprintResponse);
        assertThat(controller.activateSprint(sprintId, callerId)).isEqualTo(sprintResponse);
        assertThat(controller.completeSprint(sprintId, callerId)).isEqualTo(sprintResponse);
        assertThat(controller.assignTasksToSprint(sprintId, assignRequest, callerId)).hasSize(1);
        assertThat(controller.removeTaskFromSprint(sprintId, taskId, callerId)).isEqualTo(taskResponse);
    }
}

