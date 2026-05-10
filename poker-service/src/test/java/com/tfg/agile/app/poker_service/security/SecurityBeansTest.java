package com.tfg.agile.app.poker_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SecurityBeansTest {

    @Test
    void securityBeans_providesExpectedBeans() {
        SecurityBeans beans = new SecurityBeans();

        assertThat(beans.objectMapper()).isNotNull();
        assertThat(beans.jwtAuthFilter(mock(JwtService.class))).isNotNull();
        assertThat(beans.internalApiKeyAuthFilter("secret")).isNotNull();
    }
}

