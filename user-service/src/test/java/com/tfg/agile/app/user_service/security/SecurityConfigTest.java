package com.tfg.agile.app.user_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    @Test
    void securityConfig_canBeInstantiated() {
        SecurityConfig config = new SecurityConfig();

        assertThat(config).isNotNull();
    }
}
