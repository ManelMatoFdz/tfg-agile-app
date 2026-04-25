package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record UpdateTaskRequestDto(
        @NotBlank String title,
        String description,
        String priority,
        UUID assigneeId,
        Integer storyPoints
) {}