package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;
import java.util.UUID;

public record CreateTaskRequestDto(
        @NotBlank String title,
        String description,
        String priority,
        UUID assigneeId,
        LocalDate dueDate
) {}