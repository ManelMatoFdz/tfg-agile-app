package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Epic;
import com.tfg.agile.app.task_service.entity.EpicStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record EpicResponseDto(
        UUID id,
        UUID projectId,
        String name,
        String description,
        String color,
        EpicStatus status,
        LocalDate startDate,
        LocalDate targetDate,
        UUID createdBy,
        int totalTasks,
        int doneTasks,
        Instant createdAt,
        Instant updatedAt
) {

    public static EpicResponseDto from(Epic epic, int totalTasks, int doneTasks) {
        return new EpicResponseDto(
                epic.getId(),
                epic.getProjectId(),
                epic.getName(),
                epic.getDescription(),
                epic.getColor(),
                epic.getStatus(),
                epic.getStartDate(),
                epic.getTargetDate(),
                epic.getCreatedBy(),
                totalTasks,
                doneTasks,
                epic.getCreatedAt(),
                epic.getUpdatedAt()
        );
    }
}