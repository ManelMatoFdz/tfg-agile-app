package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateLabelRequestDto(
        @NotBlank String name,
        String color
) {}