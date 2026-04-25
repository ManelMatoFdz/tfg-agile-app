package com.tfg.agile.app.task_service.security;

import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "task-service-secret-key-that-has-at-least-thirty-two-bytes";

    @Test
    void validateAndExtractUserId_returnsSubjectUuid() {
        JwtService service = new JwtService(SECRET, "task-service", "task-client");
        UUID userId = UUID.randomUUID();

        String token = Jwts.builder()
                .subject(userId.toString())
                .issuer("task-service")
                .audience().add("task-client").and()
                .expiration(Date.from(Instant.now().plusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThat(service.validateAndExtractUserId(token)).isEqualTo(userId);
    }

    @Test
    void validateAndExtractUserId_throwsForInvalidAudience() {
        JwtService service = new JwtService(SECRET, "task-service", "task-client");
        UUID userId = UUID.randomUUID();

        String token = Jwts.builder()
                .subject(userId.toString())
                .issuer("task-service")
                .audience().add("other-client").and()
                .expiration(Date.from(Instant.now().plusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> service.validateAndExtractUserId(token)).isInstanceOf(JwtException.class);
    }
}

