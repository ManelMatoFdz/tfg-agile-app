package com.tfg.agile.app.task_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class SecurityBeansTest {

    private final SecurityBeans securityBeans = new SecurityBeans();

    @Test
    void objectMapper_returnsMapperInstance() {
        assertThat(securityBeans.objectMapper()).isNotNull();
    }

    @Test
    void jwtAuthFilter_createsFilter() {
        JwtAuthFilter filter = securityBeans.jwtAuthFilter(mock(JwtService.class));

        assertThat(filter).isNotNull();
    }

    @Test
    void internalApiKeyAuthFilter_createsFilter() {
        InternalApiKeyAuthFilter filter = securityBeans.internalApiKeyAuthFilter("secret");

        assertThat(filter).isNotNull();
    }
}

