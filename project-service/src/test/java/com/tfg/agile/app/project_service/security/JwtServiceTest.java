package com.tfg.agile.app.project_service.security;

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

    private static final String SECRET = "project-service-secret-key-that-has-at-least-thirty-two-bytes";

    @Test
    void validateAndExtractUserId_returnsSubjectAsUuid() {
        JwtService service = new JwtService(SECRET, "project-service", "project-client");
        UUID userId = UUID.randomUUID();

        String token = Jwts.builder()
                .subject(userId.toString())
                .issuer("project-service")
                .audience().add("project-client").and()
                .expiration(Date.from(Instant.now().plusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        UUID extracted = service.validateAndExtractUserId(token);

        assertThat(extracted).isEqualTo(userId);
    }

    @Test
    void validateAndExtractUserId_throwsForInvalidIssuer() {
        JwtService service = new JwtService(SECRET, "project-service", "project-client");
        UUID userId = UUID.randomUUID();

        String token = Jwts.builder()
                .subject(userId.toString())
                .issuer("other-service")
                .audience().add("project-client").and()
                .expiration(Date.from(Instant.now().plusSeconds(300)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> service.validateAndExtractUserId(token))
                .isInstanceOf(JwtException.class);
    }
}

