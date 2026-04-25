package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateTaskRequestDto;
import com.tfg.agile.app.task_service.dto.MoveTaskRequestDto;
import com.tfg.agile.app.task_service.dto.TaskResponseDto;
import com.tfg.agile.app.task_service.dto.UpdateTaskRequestDto;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;
import com.tfg.agile.app.task_service.service.TaskService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskControllerTest {

    @Mock
    private TaskService taskService;

    @Test
    void endpoints_delegateToTaskService() {
        TaskController controller = new TaskController(taskService);
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        CreateTaskRequestDto createRequest = new CreateTaskRequestDto("Task", "Desc", "HIGH", null, 5);
        UpdateTaskRequestDto updateRequest = new UpdateTaskRequestDto("Task 2", "Desc 2", "LOW", null, 8);
        MoveTaskRequestDto moveRequest = new MoveTaskRequestDto("DONE", 2);

        TaskResponseDto response = new TaskResponseDto(
                taskId, projectId, null, "Task", "Desc", TaskStatus.TODO, TaskPriority.MEDIUM,
                callerId, null, 5, 0, Instant.now(), Instant.now()
        );

        when(taskService.findMyTasks(callerId)).thenReturn(List.of(response));
        when(taskService.findByProject(projectId, callerId)).thenReturn(List.of(response));
        when(taskService.findById(taskId, callerId)).thenReturn(response);
        when(taskService.create(projectId, createRequest, callerId)).thenReturn(response);
        when(taskService.update(taskId, updateRequest, callerId)).thenReturn(response);
        when(taskService.move(taskId, moveRequest, callerId)).thenReturn(response);

        assertThat(controller.myTasks(callerId)).hasSize(1);
        assertThat(controller.listByProject(projectId, callerId)).hasSize(1);
        assertThat(controller.getById(taskId, callerId)).isEqualTo(response);
        assertThat(controller.create(projectId, createRequest, callerId).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.update(taskId, updateRequest, callerId)).isEqualTo(response);
        assertThat(controller.move(taskId, moveRequest, callerId)).isEqualTo(response);
        assertThat(controller.delete(taskId, callerId).getStatusCode().value()).isEqualTo(204);

        verify(taskService).delete(taskId, callerId);
    }
}

