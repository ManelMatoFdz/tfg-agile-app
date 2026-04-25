package com.tfg.agile.app.task_service.security;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
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
    void shouldNotFilter_returnsTrueOutsideInternalPath() {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret");

        assertThat(filter.shouldNotFilter(new MockHttpServletRequest("GET", "/projects/1/tasks"))).isTrue();
    }

    @Test
    void doFilter_authenticatesInternalRequestWhenKeyMatches() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/projects/1/members/2/permissions");
        request.addHeader("X-Internal-Api-Key", "secret");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo("internal");
    }

    @Test
    void doFilter_keepsUnauthenticatedWhenKeyDoesNotMatch() throws Exception {
        InternalApiKeyAuthFilter filter = new InternalApiKeyAuthFilter("secret");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/projects/1/members/2/permissions");
        request.addHeader("X-Internal-Api-Key", "wrong");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}

