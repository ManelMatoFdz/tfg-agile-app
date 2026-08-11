package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.GitEvent;
import com.tfg.agile.app.task_service.entity.GitEventType;

import java.time.Instant;
import java.util.UUID;

public record GitEventDto(
        UUID id,
        UUID taskId,
        String taskTitle,
        UUID projectId,
        GitEventType type,
        String externalId,
        String externalUrl,
        String title,
        String author,
        String status,
        Instant receivedAt
) {

    public static GitEventDto from(GitEvent e, String taskTitle) {
        return new GitEventDto(
                e.getId(), e.getTaskId(), taskTitle, e.getProjectId(),
                e.getType(), e.getExternalId(), e.getExternalUrl(),
                e.getTitle(), e.getAuthor(), e.getStatus(), e.getReceivedAt()
        );
    }

    public static GitEventDto from(GitEvent e) {
        return from(e, null);
    }
}
