package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.Project;
import com.tfg.agile.app.project_service.entity.ProjectVisibility;

import java.time.Instant;
import java.util.UUID;

public record ProjectResponseDto(
        UUID id,
        UUID workspaceId,
        UUID categoryId,
        UUID teamId,
        String name,
        String description,
        String color,
        ProjectVisibility visibility,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProjectResponseDto from(Project p) {
        return new ProjectResponseDto(p.getId(), p.getWorkspace().getId(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getTeam() != null ? p.getTeam().getId() : null,
                p.getName(), p.getDescription(), p.getColor(), p.getVisibility(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}