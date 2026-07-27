package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.service.BoardColumnService;
import com.tfg.agile.app.task_service.service.TaskService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InternalTaskControllerTest {

    @Mock
    private TaskService taskService;
    @Mock
    private BoardColumnService boardColumnService;

    @Test
    void updateStoryPoints_delegatesToService() {
        InternalTaskController controller = new InternalTaskController(taskService, boardColumnService);
        UUID taskId = UUID.randomUUID();
        Map<String, Integer> body = Map.of("storyPoints", 8);

        var response = controller.updateStoryPoints(taskId, body);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(taskService).updateStoryPoints(taskId, 8);
    }

    @Test
    void initBoard_delegatesToService() {
        InternalTaskController controller = new InternalTaskController(taskService, boardColumnService);
        UUID projectId = UUID.randomUUID();

        var response = controller.initBoard(projectId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(boardColumnService).createDefaultColumns(projectId);
    }
}