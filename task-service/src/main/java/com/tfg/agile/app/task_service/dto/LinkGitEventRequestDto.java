package com.tfg.agile.app.task_service.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Vinculacion manual: se pega la URL de un commit o PR de GitHub y opcionalmente
 * un titulo descriptivo. El tipo y el identificador externo se deducen de la URL.
 */
public record LinkGitEventRequestDto(
        @NotBlank String url,
        String title
) {
}
