package com.tfg.agile.app.project_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityBeansTest {

    private final SecurityBeans securityBeans = new SecurityBeans();

    @Test
    void objectMapper_returnsMapperInstance() {
        assertThat(securityBeans.objectMapper()).isNotNull();
    }

    @Test
    void jwtAuthFilter_returnsFilterInstance() {
        JwtAuthFilter filter = securityBeans.jwtAuthFilter(org.mockito.Mockito.mock(JwtService.class));

        assertThat(filter).isNotNull();
    }

    @Test
    void internalApiKeyAuthFilter_returnsFilterInstance() {
        InternalApiKeyAuthFilter filter = securityBeans.internalApiKeyAuthFilter("secret");

        assertThat(filter).isNotNull();
    }
}

