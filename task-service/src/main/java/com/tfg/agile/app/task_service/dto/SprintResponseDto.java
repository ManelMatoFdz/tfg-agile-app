package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.Sprint;
import com.tfg.agile.app.task_service.entity.SprintStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record SprintResponseDto(
        UUID id,
        UUID projectId,
        String name,
        String goal,
        SprintStatus status,
        LocalDate startDate,
        LocalDate endDate,
        Instant createdAt,
        Instant updatedAt
) {
    public static SprintResponseDto from(Sprint s) {
        return new SprintResponseDto(
                s.getId(), s.getProjectId(), s.getName(), s.getGoal(),
                s.getStatus(), s.getStartDate(), s.getEndDate(),
                s.getCreatedAt(), s.getUpdatedAt()
        );
    }
}