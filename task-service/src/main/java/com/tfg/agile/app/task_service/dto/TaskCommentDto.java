package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.TaskComment;

import java.time.Instant;
import java.util.UUID;

public record TaskCommentDto(
        UUID id,
        UUID taskId,
        UUID authorId,
        String content,
        Instant createdAt,
        Instant editedAt
) {
    public static TaskCommentDto from(TaskComment comment) {
        return new TaskCommentDto(
                comment.getId(),
                comment.getTaskId(),
                comment.getAuthorId(),
                comment.getContent(),
                comment.getCreatedAt(),
                comment.getEditedAt()
        );
    }
}