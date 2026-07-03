package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.exception.GoogleLoginNotConfiguredException;
import com.tfg.agile.app.user_service.exception.InvalidGoogleTokenException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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

    @Mock
    private RestClient restClient;

    @Mock
    private RestClient.RequestHeadersUriSpec requestHeadersUriSpec;

    @Mock
    private RestClient.RequestHeadersSpec requestHeadersSpec;

    @Mock
    private RestClient.ResponseSpec responseSpec;

    @Test
    void verifyAccessToken_throwsWhenGoogleLoginIsNotConfigured() {
        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, " ");

        assertThatThrownBy(() -> service.verifyAccessToken("access-token"))
                .isInstanceOf(GoogleLoginNotConfiguredException.class);
    }

    @Test
    void verifyAccessToken_throwsWhenGoogleEndpointFails() {
        configureRestClient();
        configureMockChain();
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenThrow(new RestClientException("boom"));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id");

        assertThatThrownBy(() -> service.verifyAccessToken("access-token"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void verifyAccessToken_throwsWhenEmailIsNotVerified() {
        configureRestClient();
        configureMockChain();
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "email", "john@example.com",
                        "email_verified", "false",
                        "sub", "subject-123"
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id");

        assertThatThrownBy(() -> service.verifyAccessToken("access-token"))
                .isInstanceOf(InvalidGoogleTokenException.class);
    }

    @Test
    void verifyAccessToken_returnsNormalizedIdentityWhenPayloadIsValid() {
        configureRestClient();
        configureMockChain();
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "email", "  JOHN@EXAMPLE.COM ",
                        "email_verified", "true",
                        "sub", "subject-123",
                        "name", "  John Doe  ",
                        "picture", "  https://img.example.com/u.png  "
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id");

        GoogleIdentityService.GoogleIdentity identity = service.verifyAccessToken("access-token");

        assertThat(identity.subject()).isEqualTo("subject-123");
        assertThat(identity.email()).isEqualTo("john@example.com");
        assertThat(identity.name()).isEqualTo("John Doe");
        assertThat(identity.pictureUrl()).isEqualTo("https://img.example.com/u.png");
    }

    @Test
    void verifyAccessToken_normalizesBlankOptionalFieldsToNull() {
        configureRestClient();
        configureMockChain();
        when(responseSpec.body(any(ParameterizedTypeReference.class)))
                .thenReturn(Map.of(
                        "email", "john@example.com",
                        "email_verified", "true",
                        "sub", "subject-123",
                        "name", "   ",
                        "picture", "   "
                ));

        GoogleIdentityService service = new GoogleIdentityService(restClientBuilder, "google-client-id");

        GoogleIdentityService.GoogleIdentity identity = service.verifyAccessToken("access-token");

        assertThat(identity.name()).isNull();
        assertThat(identity.pictureUrl()).isNull();
    }

    private void configureRestClient() {
        when(restClientBuilder.build()).thenReturn(restClient);
    }

    private void configureMockChain() {
        when(restClient.get()).thenReturn(requestHeadersUriSpec);
        when(requestHeadersUriSpec.uri(anyString())).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.header(anyString(), any(String[].class))).thenReturn(requestHeadersSpec);
        when(requestHeadersSpec.retrieve()).thenReturn(responseSpec);
    }
}