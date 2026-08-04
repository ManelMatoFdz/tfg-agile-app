package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record CreateEpicRequestDto(
        @NotBlank String name,
        String description,
        String color,
        LocalDate startDate,
        LocalDate targetDate
) {}