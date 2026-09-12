package com.tfg.agile.app.project_service.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
@Slf4j
public class DataCleanupClient {

    private final RestClient taskServiceClient;
    private final RestClient pokerServiceClient;

    public DataCleanupClient(@Value("${app.task-service.url}") String taskServiceUrl,
                             @Value("${app.poker-service.url}") String pokerServiceUrl,
                             @Value("${app.internal.api-key}") String apiKey) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(30000);

        this.taskServiceClient = RestClient.builder()
                .baseUrl(taskServiceUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .requestFactory(factory)
                .build();

        this.pokerServiceClient = RestClient.builder()
                .baseUrl(pokerServiceUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .requestFactory(factory)
                .build();
    }

    public void cleanupProject(UUID projectId) {
        RuntimeException taskFailure = deleteProjectData(taskServiceClient, "task", projectId);
        RuntimeException pokerFailure = deleteProjectData(pokerServiceClient, "poker", projectId);

        if (taskFailure != null) {
            if (pokerFailure != null) {
                taskFailure.addSuppressed(pokerFailure);
            }
            throw taskFailure;
        }
        if (pokerFailure != null) {
            throw pokerFailure;
        }
    }

    private RuntimeException deleteProjectData(RestClient client, String serviceName, UUID projectId) {
        try {
            client.delete()
                    .uri("/internal/projects/{projectId}/data", projectId)
                    .retrieve()
                    .toBodilessEntity();
            log.info("Deleted {} data for project {}", serviceName, projectId);
            return null;
        } catch (Exception e) {
            log.error("Failed to delete {} data for project {}: {}", serviceName, projectId, e.getMessage());
            return new IllegalStateException("Failed to delete " + serviceName + " data for project " + projectId, e);
        }
    }
}
