package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException;
import com.tfg.agile.app.user_service.exception.InvalidGoogleTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
public class GoogleIdentityService {

    private static final String USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    private final RestClient restClient;
    private final String googleClientId;

    public GoogleIdentityService(
            RestClient.Builder restClientBuilder,
            @Value("${security.google.client-id:}") String googleClientId
    ) {
        this.restClient = restClientBuilder.build();
        this.googleClientId = googleClientId;
    }

    public GoogleIdentity verifyAccessToken(String accessToken) {
        if (googleClientId == null || googleClientId.isBlank()) {
            throw new GoogleLoginNotConfiguredException();
        }

        Map<String, Object> payload;
        try {
            payload = restClient.get()
                    .uri(USERINFO_URL)
                    .header("Authorization", "Bearer " + accessToken)
                    .retrieve()
                    .body(new ParameterizedTypeReference<>() {});
        } catch (RestClientException ex) {
            throw new InvalidGoogleTokenException();
        }

        if (payload == null || payload.isEmpty()) {
            throw new InvalidGoogleTokenException();
        }

        String email = stringValue(payload.get("email"));
        String emailVerified = stringValue(payload.get("email_verified"));
        String subject = stringValue(payload.get("sub"));
        String name = stringValue(payload.get("name"));
        String picture = stringValue(payload.get("picture"));

        if (!"true".equalsIgnoreCase(emailVerified)
                || email == null
                || email.isBlank()
                || subject == null
                || subject.isBlank()) {
            throw new InvalidGoogleTokenException();
        }

        return new GoogleIdentity(subject, email.trim().toLowerCase(), normalize(name), normalize(picture));
    }

    private static String normalize(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private static String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    public record GoogleIdentity(String subject, String email, String name, String pictureUrl) {}
}