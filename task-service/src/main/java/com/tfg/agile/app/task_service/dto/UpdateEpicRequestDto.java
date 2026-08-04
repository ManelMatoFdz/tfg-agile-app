package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record UpdateEpicRequestDto(
        @NotBlank String name,
        String description,
        String color,
        String status,
        LocalDate startDate,
        LocalDate targetDate
) {}