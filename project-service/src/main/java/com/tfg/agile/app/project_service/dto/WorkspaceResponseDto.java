package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.Workspace;

import java.time.Instant;
import java.util.UUID;

public record WorkspaceResponseDto(
        UUID id,
        String name,
        String description,
        UUID ownerId,
        Instant createdAt,
        Instant updatedAt
) {
    public static WorkspaceResponseDto from(Workspace w) {
        return new WorkspaceResponseDto(w.getId(), w.getName(), w.getDescription(),
                w.getOwnerId(), w.getCreatedAt(), w.getUpdatedAt());
    }
}