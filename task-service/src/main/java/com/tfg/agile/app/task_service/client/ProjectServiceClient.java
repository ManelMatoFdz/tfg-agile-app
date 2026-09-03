package com.tfg.agile.app.task_service.client;

import com.tfg.agile.app.task_service.exception.ForbiddenException;
import com.tfg.agile.app.task_service.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class ProjectServiceClient {

    private final RestClient restClient;

    public ProjectServiceClient(
            @Value("${app.project-service.url}") String baseUrl,
            @Value("${app.internal.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .requestFactory(new SimpleClientHttpRequestFactory())
                .build();
    }

    public MemberPermissionsDto getMemberPermissions(UUID projectId, UUID userId) {
        try {
            return restClient.get()
                    .uri("/internal/projects/{projectId}/members/{userId}/permissions", projectId, userId)
                    .retrieve()
                    .body(MemberPermissionsDto.class);
        } catch (HttpClientErrorException ex) {
            if (ex.getStatusCode() == HttpStatus.NOT_FOUND) {
                throw new ForbiddenException("NOT_PROJECT_MEMBER");
            }
            throw ex;
        }
    }

    public void touchProject(UUID projectId) {
        try {
            restClient.post()
                    .uri("/internal/projects/{projectId}/touch", projectId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // Non-critical: if project-service is down, task operations should still succeed
        }
    }

    public void touchMemberActivity(UUID projectId, UUID userId) {
        try {
            restClient.post()
                    .uri("/internal/projects/{projectId}/members/{userId}/touch", projectId, userId)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ignored) {
            // Non-critical
        }
    }
}
