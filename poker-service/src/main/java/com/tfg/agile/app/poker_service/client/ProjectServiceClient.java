package com.tfg.agile.app.poker_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.UUID;

@Component
public class ProjectServiceClient {

    private static final Logger log = LoggerFactory.getLogger(ProjectServiceClient.class);

    private final RestClient restClient;

    public ProjectServiceClient(
            @Value("${app.project-service.url}") String baseUrl,
            @Value("${app.internal.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .build();
    }

    public ProjectMemberIdsDto getMemberIds(UUID projectId) {
        try {
            return restClient.get()
                    .uri("/internal/projects/{projectId}/member-ids", projectId)
                    .retrieve()
                    .body(ProjectMemberIdsDto.class);
        } catch (Exception e) {
            log.error("Failed to get member ids for project {}: {}", projectId, e.getMessage());
            return null;
        }
    }
}