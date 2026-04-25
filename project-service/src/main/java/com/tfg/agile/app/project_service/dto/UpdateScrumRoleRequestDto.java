package com.tfg.agile.app.project_service.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateScrumRoleRequestDto(
        @NotBlank String scrumRole
) {}