package com.tfg.agile.app.poker_service.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final String issuer;
    private final String audience;

    public JwtService(
            @Value("${security.jwt.secret}") String secret,
            @Value("${security.jwt.issuer}") String issuer,
            @Value("${security.jwt.audience}") String audience) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.issuer = issuer;
        this.audience = audience;
    }

    public record JwtClaims(UUID userId, int tokenVersion) {}

    public JwtClaims validateAndExtract(String token) {
        var claims = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .requireAudience(audience)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        UUID userId = UUID.fromString(claims.getSubject());
        Number tv = claims.get("tokenVersion", Number.class);
        int tokenVersion = tv == null ? 0 : tv.intValue();
        return new JwtClaims(userId, tokenVersion);
    }

    public UUID validateAndExtractUserId(String token) {
        return validateAndExtract(token).userId();
    }
}