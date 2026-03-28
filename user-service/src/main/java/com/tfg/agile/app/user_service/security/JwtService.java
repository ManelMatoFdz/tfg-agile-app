package com.tfg.agile.app.user_service.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final byte[] keyBytes;
    private final long expirationMinutes;
    private final String issuer;
    private final String audience;

    public JwtService(
            @Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.expirationMinutes}") long expirationMinutes,
            @Value("${security.jwt.issuer}") String issuer,
            @Value("${security.jwt.audience}") String audience
    ) {
        this.keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationMinutes = expirationMinutes;
        this.issuer = issuer;
        this.audience = audience;
    }

    public String generateAccessToken(UUID userId, String email, int tokenVersion) {
        Instant now = Instant.now();
        Instant exp = now.plus(expirationMinutes, ChronoUnit.MINUTES);

        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("tokenVersion", tokenVersion)
                .issuer(issuer)
                .audience().add(audience).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .signWith(Keys.hmacShaKeyFor(keyBytes))
                .compact();
    }

    public AccessTokenClaims extractAccessTokenClaims(String token) {
        var payload = Jwts.parser()
                .verifyWith(Keys.hmacShaKeyFor(keyBytes))
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        String subject = payload.getSubject();
        Number tokenVersionValue = payload.get("tokenVersion", Number.class);
        int tokenVersion = tokenVersionValue == null ? 0 : tokenVersionValue.intValue();
        return new AccessTokenClaims(UUID.fromString(subject), tokenVersion);
    }

    public record AccessTokenClaims(UUID userId, int tokenVersion) {
    }
}
