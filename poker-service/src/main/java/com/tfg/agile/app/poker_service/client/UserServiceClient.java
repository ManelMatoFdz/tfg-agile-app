package com.tfg.agile.app.poker_service.client;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class UserServiceClient {

    private static final Logger log = LoggerFactory.getLogger(UserServiceClient.class);

    private final RestClient restClient;

    public UserServiceClient(
            @Value("${app.user-service.url}") String baseUrl,
            @Value("${app.internal.api-key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .build();
    }

    public void sendNotification(UUID userId, String title, String message, String type, String link, String data) {
        sendNotification(userId, title, message, type, link, data, null);
    }

    public void sendNotification(UUID userId, String title, String message, String type, String link, String data, UUID actorUserId) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("userId", userId);
            body.put("title", title);
            body.put("message", message);
            body.put("type", type);
            body.put("link", link != null ? link : "");
            body.put("data", data != null ? data : "");
            if (actorUserId != null) body.put("actorUserId", actorUserId);

            restClient.post()
                    .uri("/internal/notifications/enqueue")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.error("Failed to send notification to user {}: {}", userId, e.getMessage());
        }
    }
}
