package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException;
import com.tfg.agile.app.user_service.exception.InvalidGoogleTokenException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Answers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleIdentityServiceTest {

    @Mock
    private RestClient.Builder restClientBuilder;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private RestClient restClient;

    @Test
    void verifyIdToken_throwsWhenGoogleLoginIsNotConfigured() {
        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, " ", "https://oauth2.googleapis.com/tokeninfo");

        assertThatThrownBy(() -> service.verifyIdToken("id-token"))
                .isInstanceOf(GoogleLoginNotConfiguredException.class);
    }

    @Test
    void verifyIdToken_throwsWhenGoogleEndpointFails() {
        configureRestClient();
        when(restClient.get().uri(anyString(), any(Object[].class)).retrieve().body(any(ParameterizedTypeReference.class)))
                .thenThrow(new RestClientException("boom"));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id", "https://oauth2.googleapis.com/tokeninfo");

        assertThatThrownBy(() -> service.verifyIdToken("id-token"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void verifyIdToken_throwsWhenPayloadContainsInvalidClaims() {
        configureRestClient();
        when(restClient.get().uri(anyString(), any(Object[].class)).retrieve().body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "aud", "another-client",
                        "iss", "https://accounts.google.com",
                        "email", "john@example.com",
                        "email_verified", "true",
                        "sub", "subject-123"
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id", "https://oauth2.googleapis.com/tokeninfo");

        assertThatThrownBy(() -> service.verifyIdToken("id-token"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void verifyIdToken_returnsNormalizedIdentityWhenPayloadIsValid() {
        configureRestClient();
        when(restClient.get().uri(anyString(), any(Object[].class)).retrieve().body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "aud", "google-client-id",
                        "iss", "accounts.google.com",
                        "email", "  JOHN@EXAMPLE.COM ",
                        "email_verified", "true",
                        "sub", "subject-123",
                        "name", "  John Doe  ",
                        "picture", "  https://img.example.com/u.png  "
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id", "https://oauth2.googleapis.com/tokeninfo");

        GoogleIdentityService.GoogleIdentity identity = service.verifyIdToken("id-token");

        assertThat(identity.subject()).isEqualTo("subject-123");
        assertThat(identity.email()).isEqualTo("john@example.com");
        assertThat(identity.name()).isEqualTo("John Doe");
        assertThat(identity.pictureUrl()).isEqualTo("https://img.example.com/u.png");
    }

    @Test
    void verifyIdToken_normalizesBlankOptionalFieldsToNull() {
        configureRestClient();
        when(restClient.get().uri(anyString(), any(Object[].class)).retrieve().body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "aud", "google-client-id",
                        "iss", "https://accounts.google.com",
                        "email", "john@example.com",
                        "email_verified", "true",
                        "sub", "subject-123",
                        "name", "   ",
                        "picture", "   "
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id", "https://oauth2.googleapis.com/tokeninfo");

        GoogleIdentityService.GoogleIdentity identity = service.verifyIdToken("id-token");

        assertThat(identity.name()).isNull();
        assertThat(identity.pictureUrl()).isNull();
    }

    private void configureRestClient() {
        when(restClientBuilder.build()).thenReturn(restClient);
    }
}
