package com.tfg.agile.app.project_service.dto;

import com.tfg.agile.app.project_service.entity.Category;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponseDto(
        UUID id,
        UUID workspaceId,
        String name,
        String color,
        int position,
        Instant createdAt
) {
    public static CategoryResponseDto from(Category c) {
        return new CategoryResponseDto(c.getId(), c.getWorkspace().getId(),
                c.getName(), c.getColor(), c.getPosition(), c.getCreatedAt());
    }
}