package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.GitIntegration;
import com.tfg.agile.app.task_service.entity.GitProvider;

import java.time.Instant;
import java.util.UUID;

/**
 * El campo {@code webhookSecret} solo se rellena en la respuesta del setup.
 * En las lecturas posteriores viaja siempre a null.
 */
public record GitIntegrationDto(
        UUID id,
        UUID projectId,
        GitProvider provider,
        String repositoryUrl,
        String webhookUrl,
        String webhookSecret,
        Instant createdAt
) {

    public static GitIntegrationDto from(GitIntegration integration, String webhookUrl, String secret) {
        return new GitIntegrationDto(
                integration.getId(),
                integration.getProjectId(),
                integration.getProvider(),
                integration.getRepositoryUrl(),
                webhookUrl,
                secret,
                integration.getCreatedAt()
        );
    }
}
