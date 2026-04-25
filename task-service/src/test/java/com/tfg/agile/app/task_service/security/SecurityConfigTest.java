package com.tfg.agile.app.task_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    @Test
    void securityConfig_canBeInstantiated() {
        SecurityConfig config = new SecurityConfig(
                new JwtAuthFilter(mock(JwtService.class)),
                new InternalApiKeyAuthFilter("secret"),
                new tools.jackson.databind.ObjectMapper()
        );

        assertThat(config).isNotNull();
    }
}

