package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskStatus;

import java.time.Instant;
import java.util.UUID;

public record TaskResponseDto(
        UUID id,
        UUID projectId,
        UUID sprintId,
        String title,
        String description,
        TaskStatus status,
        TaskPriority priority,
        UUID reporterId,
        UUID assigneeId,
        Integer storyPoints,
        int position,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponseDto from(Task t) {
        return new TaskResponseDto(
                t.getId(), t.getProjectId(), t.getSprintId(), t.getTitle(), t.getDescription(),
                t.getStatus(), t.getPriority(), t.getReporterId(), t.getAssigneeId(),
                t.getStoryPoints(), t.getPosition(), t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}