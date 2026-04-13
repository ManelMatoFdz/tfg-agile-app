package com.tfg.agile.app.user_service.security;

import com.tfg.agile.app.user_service.entity.User;
import com.tfg.agile.app.user_service.repository.UserRepository;
import com.tfg.agile.app.user_service.support.TestDataFactory;
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

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class JwtAuthFilterTest {

    @Mock
    private JwtService jwtService;
    @Mock
    private UserRepository userRepository;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void doFilterInternal_withoutBearerDoesNotAuthenticate() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, userRepository);
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void doFilterInternal_withValidBearerAuthenticatesUser() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, userRepository);
        User user = TestDataFactory.user();

        when(jwtService.extractAccessTokenClaims("valid-token"))
                .thenReturn(new JwtService.AccessTokenClaims(user.getId(), user.getTokenVersion()));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer valid-token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal())
                .isEqualTo(user.getId().toString());
    }

    @Test
    void doFilterInternal_whenTokenIsInvalidDoesNotAuthenticate() throws Exception {
        JwtAuthFilter filter = new JwtAuthFilter(jwtService, userRepository);
        when(jwtService.extractAccessTokenClaims(anyString())).thenThrow(new JwtException("bad token"));

        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader(HttpHeaders.AUTHORIZATION, "Bearer invalid-token");

        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}

