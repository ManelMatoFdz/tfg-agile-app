package com.tfg.agile.app.user_service.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SECRET = "this-is-a-very-long-secret-for-hs256-signing-key-12345";

    @Test
    void generateAndExtract_performsClaimsRoundTrip() {
        JwtService jwtService = new JwtService(SECRET, 30, "user-service", "frontend");
        UUID userId = UUID.randomUUID();

        String token = jwtService.generateAccessToken(userId, "john@example.com", 4);
        JwtService.AccessTokenClaims claims = jwtService.extractAccessTokenClaims(token);

        assertThat(claims.userId()).isEqualTo(userId);
        assertThat(claims.tokenVersion()).isEqualTo(4);
    }

    @Test
    void extract_failsWhenIssuerDoesNotMatch() {
        JwtService jwtService = new JwtService(SECRET, 30, "user-service", "frontend");

        String invalidIssuerToken = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .claim("tokenVersion", 1)
                .issuer("other-service")
                .audience().add("frontend").and()
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plus(30, ChronoUnit.MINUTES)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertThatThrownBy(() -> jwtService.extractAccessTokenClaims(invalidIssuerToken))
                .isInstanceOf(RuntimeException.class);
    }

    @Test
    void extract_tokenWithoutTokenVersionReturnsZero() {
        JwtService jwtService = new JwtService(SECRET, 30, "user-service", "frontend");

        String tokenWithoutVersion = Jwts.builder()
                .subject(UUID.randomUUID().toString())
                .issuer("user-service")
                .audience().add("frontend").and()
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plus(30, ChronoUnit.MINUTES)))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        JwtService.AccessTokenClaims claims = jwtService.extractAccessTokenClaims(tokenWithoutVersion);

        assertThat(claims.tokenVersion()).isZero();
    }
}

