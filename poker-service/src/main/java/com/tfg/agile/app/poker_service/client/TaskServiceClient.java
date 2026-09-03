package com.tfg.agile.app.poker_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;
import java.util.UUID;

@Component
public class TaskServiceClient {

    private static final Logger log = LoggerFactory.getLogger(TaskServiceClient.class);

    private final RestClient restClient;

    public TaskServiceClient(
            @Value("${app.task-service.url}") String baseUrl,
            @Value("${app.internal.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .requestFactory(new SimpleClientHttpRequestFactory())
                .build();
    }

    public void updateStoryPoints(UUID taskId, int storyPoints) {
        try {
            restClient.put()
                    .uri("/internal/tasks/{taskId}/story-points", taskId)
                    .body(Map.of("storyPoints", storyPoints))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to update story points for task {}: {}", taskId, e.getMessage());
        }
    }
}
