package com.tfg.agile.app.task_service.security;

import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.OptionalInt;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtService jwtService;

    @Mock
    private TokenVersionClient tokenVersionClient;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilter_withoutBearerHeader_doesNotAuthenticate() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, tokenVersionClient);

        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilter_withValidBearerHeader_authenticatesUuidPrincipal() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, tokenVersionClient);
        UUID userId = UUID.randomUUID();
        when(jwtService.validateAndExtract("token")).thenReturn(new JwtService.JwtClaims(userId, 0));
        when(tokenVersionClient.getTokenVersion(userId)).thenReturn(OptionalInt.of(0));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(userId);
    }

    @Test
    void doFilter_withInvalidToken_clearsAuthentication() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, tokenVersionClient);
        when(jwtService.validateAndExtract("bad-token")).thenThrow(new JwtException("invalid"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer bad-token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilter_withMismatchedTokenVersion_rejectsToken() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, tokenVersionClient);
        UUID userId = UUID.randomUUID();
        when(jwtService.validateAndExtract("token")).thenReturn(new JwtService.JwtClaims(userId, 0));
        when(tokenVersionClient.getTokenVersion(userId)).thenReturn(OptionalInt.of(1));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}