package com.tfg.agile.app.project_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateProjectRequestDto(
        @NotBlank @Size(max = 100) String name,
        @Size(max = 500) String description,
        UUID categoryId
) {}