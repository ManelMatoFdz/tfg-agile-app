package com.tfg.agile.app.user_service.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;

class InternalApiKeyAuthFilterTest {

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_nonInternalRouteDoesNotAuthenticate() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret-key");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/auth/login");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_internalRouteWithBearerBypassesApiKeyAuth() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret-key");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/notifications");
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_validApiKeyAuthenticatesAsInternalService() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret-key");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/notifications");
        request.addHeader("X-Internal-Api-Key", "secret-key");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo("internal-service");
    }

    @Test
    void doFilterInternal_invalidApiKeyDoesNotAuthenticate() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret-key");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/notifications");
        request.addHeader("X-Internal-Api-Key", "wrong-key");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}

