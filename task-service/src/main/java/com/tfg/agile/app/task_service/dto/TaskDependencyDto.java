package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.TaskDependency;

import java.time.Instant;
import java.util.UUID;

public record TaskDependencyDto(
        UUID id,
        UUID blockingTaskId,
        String blockingTaskTitle,
        String blockingTaskStatus,
        UUID blockedTaskId,
        String blockedTaskTitle,
        String blockedTaskStatus,
        UUID createdBy,
        Instant createdAt
) {
    public static TaskDependencyDto from(TaskDependency dep,
                                         String blockingTitle, String blockingStatus,
                                         String blockedTitle, String blockedStatus) {
        return new TaskDependencyDto(
                dep.getId(),
                dep.getBlockingTaskId(), blockingTitle, blockingStatus,
                dep.getBlockedTaskId(), blockedTitle, blockedStatus,
                dep.getCreatedBy(),
                dep.getCreatedAt()
        );
    }
}
