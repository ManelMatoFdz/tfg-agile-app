package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;
import java.util.UUID;

public record CreateTaskRequestDto(
        @NotBlank String title,
        String description,
        String priority,
        String type,
        UUID parentId,
        UUID assigneeId,
        List<UUID> labelIds
) {}