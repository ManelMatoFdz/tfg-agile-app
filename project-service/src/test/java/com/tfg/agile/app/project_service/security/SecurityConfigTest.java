package com.tfg.agile.app.project_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void securityConfig_canBeInstantiated() {
        SecurityConfig config = new SecurityConfig(
                new JwtAuthFilter(org.mockito.Mockito.mock(JwtService.class)),
                new InternalApiKeyAuthFilter("secret"),
                new tools.jackson.databind.ObjectMapper()
        );

        assertThat(config).isNotNull();
    }
}

