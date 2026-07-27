package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateCommentRequestDto;
import com.tfg.agile.app.task_service.dto.UpdateCommentRequestDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskComment;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskCommentRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import com.tfg.agile.app.task_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private TaskCommentRepository commentRepository;
    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectServiceClient projectServiceClient;

    private CommentService service;

    @BeforeEach
    void setUp() {
        service = new CommentService(commentRepository, taskRepository, projectServiceClient);
    }

    @Test
    void findByTask_returnsCommentsOrderedByCreatedAt() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID taskId = task.getId();

        TaskComment comment = TaskComment.builder()
                .id(UUID.randomUUID())
                .taskId(taskId)
                .authorId(callerId)
                .content("First comment")
                .createdAt(Instant.now())
                .build();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId)).thenReturn(List.of(comment));

        var result = service.findByTask(taskId, callerId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).content()).isEqualTo("First comment");
        verify(projectServiceClient).getMemberPermissions(projectId, callerId);
    }

    @Test
    void create_savesCommentAndReturnsDto() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID taskId = task.getId();

        when(taskRepository.findById(taskId)).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, callerId)).thenReturn(TestDataFactory.memberPermissions());
        when(commentRepository.save(any(TaskComment.class))).thenAnswer(invocation -> {
            TaskComment c = invocation.getArgument(0);
            c.setId(UUID.randomUUID());
            c.setCreatedAt(Instant.now());
            return c;
        });

        var result = service.create(taskId, new CreateCommentRequestDto("My comment"), callerId);

        assertThat(result.content()).isEqualTo("My comment");
        assertThat(result.authorId()).isEqualTo(callerId);
        assertThat(result.taskId()).isEqualTo(taskId);
    }

    @Test
    void update_authorCanUpdate() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID commentId = UUID.randomUUID();

        TaskComment comment = TaskComment.builder()
                .id(commentId)
                .taskId(task.getId())
                .authorId(callerId)
                .content("Original")
                .createdAt(Instant.now())
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(commentRepository.save(any(TaskComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.update(commentId, new UpdateCommentRequestDto("Updated"), callerId);

        assertThat(result.content()).isEqualTo("Updated");
        assertThat(comment.getEditedAt()).isNotNull();
    }

    @Test
    void update_adminCanUpdateOthersComment() {
        UUID adminId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID commentId = UUID.randomUUID();

        TaskComment comment = TaskComment.builder()
                .id(commentId)
                .taskId(task.getId())
                .authorId(authorId)
                .content("Original")
                .createdAt(Instant.now())
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, adminId)).thenReturn(TestDataFactory.adminPermissions());
        when(commentRepository.save(any(TaskComment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.update(commentId, new UpdateCommentRequestDto("Admin edit"), adminId);

        assertThat(result.content()).isEqualTo("Admin edit");
    }

    @Test
    void update_throwsWhenNotAuthorNorAdmin() {
        UUID otherId = UUID.randomUUID();
        UUID authorId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID commentId = UUID.randomUUID();

        TaskComment comment = TaskComment.builder()
                .id(commentId)
                .taskId(task.getId())
                .authorId(authorId)
                .content("Original")
                .createdAt(Instant.now())
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));
        when(projectServiceClient.getMemberPermissions(projectId, otherId)).thenReturn(TestDataFactory.memberPermissions());

        assertThatThrownBy(() -> service.update(commentId, new UpdateCommentRequestDto("Nope"), otherId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("ONLY_AUTHOR_OR_ADMIN_CAN_MODIFY_COMMENT");
    }

    @Test
    void delete_deletesComment() {
        UUID callerId = UUID.randomUUID();
        UUID projectId = UUID.randomUUID();
        Task task = TestDataFactory.task(projectId, UUID.randomUUID());
        UUID commentId = UUID.randomUUID();

        TaskComment comment = TaskComment.builder()
                .id(commentId)
                .taskId(task.getId())
                .authorId(callerId)
                .content("To delete")
                .createdAt(Instant.now())
                .build();

        when(commentRepository.findById(commentId)).thenReturn(Optional.of(comment));
        when(taskRepository.findById(task.getId())).thenReturn(Optional.of(task));

        service.delete(commentId, callerId);

        verify(commentRepository).delete(comment);
    }

    @Test
    void delete_throwsWhenCommentNotFound() {
        UUID commentId = UUID.randomUUID();

        when(commentRepository.findById(commentId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(commentId, UUID.randomUUID()))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("COMMENT_NOT_FOUND");
    }
}