package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateCommentRequestDto;
import com.tfg.agile.app.task_service.dto.TaskCommentDto;
import com.tfg.agile.app.task_service.dto.UpdateCommentRequestDto;
import com.tfg.agile.app.task_service.service.CommentService;
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
class CommentControllerTest {

    @Mock
    private CommentService commentService;

    @Test
    void listByTask_delegatesToService() {
        CommentController controller = new CommentController(commentService);
        UUID taskId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        TaskCommentDto dto = new TaskCommentDto(UUID.randomUUID(), taskId, callerId, "comment", Instant.now(), null);

        when(commentService.findByTask(taskId, callerId)).thenReturn(List.of(dto));

        assertThat(controller.listByTask(taskId, callerId)).hasSize(1);
    }

    @Test
    void create_delegatesToServiceAndReturnsCreated() {
        CommentController controller = new CommentController(commentService);
        UUID taskId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        CreateCommentRequestDto request = new CreateCommentRequestDto("New comment");

        TaskCommentDto dto = new TaskCommentDto(UUID.randomUUID(), taskId, callerId, "New comment", Instant.now(), null);
        when(commentService.create(taskId, request, callerId)).thenReturn(dto);

        var response = controller.create(taskId, request, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isEqualTo(dto);
    }

    @Test
    void update_delegatesToService() {
        CommentController controller = new CommentController(commentService);
        UUID commentId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();
        UpdateCommentRequestDto request = new UpdateCommentRequestDto("Updated");

        TaskCommentDto dto = new TaskCommentDto(commentId, UUID.randomUUID(), callerId, "Updated", Instant.now(), Instant.now());
        when(commentService.update(commentId, request, callerId)).thenReturn(dto);

        assertThat(controller.update(commentId, request, callerId)).isEqualTo(dto);
    }

    @Test
    void delete_delegatesToServiceAndReturnsNoContent() {
        CommentController controller = new CommentController(commentService);
        UUID commentId = UUID.randomUUID();
        UUID callerId = UUID.randomUUID();

        var response = controller.delete(commentId, callerId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(commentService).delete(commentId, callerId);
    }
}