package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.entity.TaskPriority;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record TaskResponseDto(
        UUID id,
        UUID projectId,
        UUID sprintId,
        String title,
        String description,
        String status,
        TaskPriority priority,
        UUID reporterId,
        UUID assigneeId,
        Instant completedAt,
        Integer storyPoints,
        int position,
        List<LabelDto> labels,
        Instant createdAt,
        Instant updatedAt
) {
    public static TaskResponseDto from(Task t) {
        List<LabelDto> labelDtos = t.getLabels() != null
                ? t.getLabels().stream().map(LabelDto::from).toList()
                : List.of();
        return new TaskResponseDto(
                t.getId(), t.getProjectId(), t.getSprintId(), t.getTitle(), t.getDescription(),
                t.getStatus(), t.getPriority(), t.getReporterId(), t.getAssigneeId(),
                t.getCompletedAt(),
                t.getStoryPoints(), t.getPosition(), labelDtos,
                t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}