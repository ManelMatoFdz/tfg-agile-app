package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.Team;

import java.time.Instant;
import java.util.UUID;

public record TeamResponseDto(
        UUID id,
        UUID workspaceId,
        String name,
        String description,
        Instant createdAt,
        Instant updatedAt
) {
    public static TeamResponseDto from(Team t) {
        return new TeamResponseDto(t.getId(), t.getWorkspace().getId(),
                t.getName(), t.getDescription(), t.getCreatedAt(), t.getUpdatedAt());
    }
}