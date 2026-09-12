package com.tfg.agile.app.poker_service.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TokenVersionClient {

    private static final Logger log = LoggerFactory.getLogger(TokenVersionClient.class);
    private static final long CACHE_TTL_SECONDS = 30;

    private final RestClient restClient;
    private final ConcurrentHashMap<UUID, CachedVersion> cache = new ConcurrentHashMap<>();

    public TokenVersionClient(
            @Value("${app.user-service.url}") String baseUrl,
            @Value("${app.internal.api-key}") String apiKey) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(2000);
        this.restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("X-Internal-Api-Key", apiKey)
                .requestFactory(factory)
                .build();
    }

    public OptionalInt getTokenVersion(UUID userId) {
        CachedVersion cached = cache.get(userId);
        if (cached != null && cached.isValid()) {
            return OptionalInt.of(cached.version);
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Integer> body = restClient.get()
                    .uri("/internal/users/{userId}/token-version", userId)
                    .retrieve()
                    .body(Map.class);
            if (body != null && body.containsKey("tokenVersion")) {
                int version = body.get("tokenVersion");
                cache.put(userId, new CachedVersion(version, Instant.now()));
                return OptionalInt.of(version);
            }
            return OptionalInt.empty();
        } catch (Exception e) {
            log.warn("Could not verify token version for user {}: {}", userId, e.getMessage());
            return OptionalInt.empty();
        }
    }

    private record CachedVersion(int version, Instant fetchedAt) {
        boolean isValid() {
            return Instant.now().getEpochSecond() - fetchedAt.getEpochSecond() < CACHE_TTL_SECONDS;
        }
    }
}