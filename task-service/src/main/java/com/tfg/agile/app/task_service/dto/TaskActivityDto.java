package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.TaskActivity;

import java.time.Instant;
import java.util.UUID;

public record TaskActivityDto(
        UUID id,
        UUID taskId,
        UUID actorId,
        String type,
        String oldValue,
        String newValue,
        Instant createdAt
) {
    public static TaskActivityDto from(TaskActivity a) {
        return new TaskActivityDto(
                a.getId(),
                a.getTaskId(),
                a.getActorId(),
                a.getType().name(),
                a.getOldValue(),
                a.getNewValue(),
                a.getCreatedAt()
        );
    }
}