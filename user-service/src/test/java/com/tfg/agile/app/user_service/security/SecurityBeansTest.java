package com.tfg.agile.app.user_service.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.tfg.agile.app.user_service.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

@ExtendWith(MockitoExtension.class)
class SecurityBeansTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private UserRepository userRepository;

    private final SecurityBeans beans = new SecurityBeans();

    @Test
    void passwordEncoder_returnsBCryptEncoder() {
        PasswordEncoder encoder = beans.passwordEncoder();

        String encoded = encoder.encode("secret123");

        assertThat(encoded).isNotBlank();
        assertThat(encoder.matches("secret123", encoded)).isTrue();
    }

    @Test
    void objectMapper_returnsMapperInstance() {
        ObjectMapper objectMapper = beans.objectMapper();

        assertThat(objectMapper).isNotNull();
    }

    @Test
    void restClientBuilder_returnsBuilderInstance() {
        RestClient.Builder builder = beans.restClientBuilder();

        assertThat(builder).isNotNull();
    }

    @Test
    void jwtAuthFilter_buildsFilterWithDependencies() {
        JwtAuthFilter filter = beans.jwtAuthFilter(jwtService, userRepository);

        assertThat(filter).isNotNull();
    }

    @Test
    void internalApiKeyAuthFilter_buildsFilterWithProvidedKey() {
        InternalApiKeyAuthFilter filter = beans.internalApiKeyAuthFilter("internal-key");

        assertThat(filter).isNotNull();
    }
}

