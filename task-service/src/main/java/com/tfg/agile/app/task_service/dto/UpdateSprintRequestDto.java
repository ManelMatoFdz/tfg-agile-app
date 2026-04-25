package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

public record UpdateSprintRequestDto(
        @NotBlank String name,
        String goal,
        LocalDate startDate,
        LocalDate endDate
) {}