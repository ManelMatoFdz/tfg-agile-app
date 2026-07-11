package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.SprintTaskSnapshot;
import com.tfg.agile.app.task_service.entity.TaskPriority;
import com.tfg.agile.app.task_service.entity.TaskType;

import java.time.Instant;
import java.util.UUID;

public record SprintTaskSnapshotDto(
        UUID id,
        UUID sprintId,
        UUID taskId,
        String title,
        String description,
        String statusAtEnd,
        TaskPriority priority,
        TaskType type,
        UUID parentTaskId,
        Instant completedAt,
        Integer storyPoints,
        boolean completed,
        boolean returnedToBacklog
) {
    public static SprintTaskSnapshotDto from(SprintTaskSnapshot s) {
        return new SprintTaskSnapshotDto(
                s.getId(),
                s.getSprintId(),
                s.getTaskId(),
                s.getTitle(),
                s.getDescription(),
                s.getStatusAtEnd(),
                s.getPriority(),
                s.getType(),
                s.getParentTaskId(),
                s.getCompletedAt(),
                s.getStoryPoints(),
                s.isCompleted(),
                s.isReturnedToBacklog()
        );
    }
}