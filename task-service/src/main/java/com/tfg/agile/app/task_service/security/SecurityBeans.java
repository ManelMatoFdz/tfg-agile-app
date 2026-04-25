package com.tfg.agile.app.task_service.security;

import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SecurityBeans {

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public JwtAuthFilter jwtAuthFilter(JwtService jwtService) {
        return new JwtAuthFilter(jwtService);
    }

    @Bean
    public InternalApiKeyAuthFilter internalApiKeyAuthFilter(
            @Value("${app.internal.api-key}") String apiKey) {
        return new InternalApiKeyAuthFilter(apiKey);
    }
}