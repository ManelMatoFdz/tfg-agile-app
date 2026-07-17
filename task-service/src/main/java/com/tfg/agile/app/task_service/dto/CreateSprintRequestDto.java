package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record CreateSprintRequestDto(
        @NotBlank String name,
        String goal,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate
) {}