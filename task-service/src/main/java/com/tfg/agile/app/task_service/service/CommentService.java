package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.client.MemberPermissionsDto;
import com.tfg.agile.app.task_service.client.ProjectServiceClient;
import com.tfg.agile.app.task_service.dto.CreateCommentRequestDto;
import com.tfg.agile.app.task_service.dto.TaskCommentDto;
import com.tfg.agile.app.task_service.dto.UpdateCommentRequestDto;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskComment;
import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.task_service.repository.TaskCommentRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class CommentService {

    private final TaskCommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectServiceClient projectServiceClient;

    public CommentService(TaskCommentRepository commentRepository,
                          TaskRepository taskRepository,
                          ProjectServiceClient projectServiceClient) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.projectServiceClient = projectServiceClient;
    }

    @Transactional(readOnly = true)
    public List<TaskCommentDto> findByTask(UUID taskId, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        requireMember(task.getProjectId(), callerId);
        return commentRepository.findByTaskIdOrderByCreatedAtAsc(taskId).stream()
                .map(TaskCommentDto::from)
                .toList();
    }

    @Transactional
    public TaskCommentDto create(UUID taskId, CreateCommentRequestDto dto, UUID callerId) {
        Task task = getTaskOrThrow(taskId);
        requireMember(task.getProjectId(), callerId);

        TaskComment comment = TaskComment.builder()
                .taskId(taskId)
                .authorId(callerId)
                .content(dto.content())
                .build();

        return TaskCommentDto.from(commentRepository.save(comment));
    }

    @Transactional
    public TaskCommentDto update(UUID commentId, UpdateCommentRequestDto dto, UUID callerId) {
        TaskComment comment = getCommentOrThrow(commentId);
        Task task = getTaskOrThrow(comment.getTaskId());
        requireAuthorOrAdmin(comment, task.getProjectId(), callerId);

        comment.setContent(dto.content());
        comment.setEditedAt(Instant.now());

        return TaskCommentDto.from(commentRepository.save(comment));
    }

    @Transactional
    public void delete(UUID commentId, UUID callerId) {
        TaskComment comment = getCommentOrThrow(commentId);
        Task task = getTaskOrThrow(comment.getTaskId());
        requireAuthorOrAdmin(comment, task.getProjectId(), callerId);

        commentRepository.delete(comment);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private Task getTaskOrThrow(UUID id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("TASK_NOT_FOUND"));
    }

    private TaskComment getCommentOrThrow(UUID id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("COMMENT_NOT_FOUND"));
    }

    private MemberPermissionsDto requireMember(UUID projectId, UUID userId) {
        return projectServiceClient.getMemberPermissions(projectId, userId);
    }

    private void requireAuthorOrAdmin(TaskComment comment, UUID projectId, UUID callerId) {
        if (comment.getAuthorId().equals(callerId)) return;
        MemberPermissionsDto perms = requireMember(projectId, callerId);
        if (!perms.workspaceAdmin() && !perms.teamAdmin()) {
            throw new ForbiddenException("ONLY_AUTHOR_OR_ADMIN_CAN_MODIFY_COMMENT");
        }
    }
}