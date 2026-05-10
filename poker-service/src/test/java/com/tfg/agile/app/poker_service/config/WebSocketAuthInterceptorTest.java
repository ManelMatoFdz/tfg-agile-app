package com.tfg.agile.app.poker_service.config;

import com.tfg.agile.app.poker_service.security.JwtService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.socket.WebSocketHandler;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WebSocketAuthInterceptorTest {

    @Mock
    private JwtService jwtService;

    @Test
    void beforeHandshake_acceptsValidTokenAndStoresUserId() {
        WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwtService);
        UUID userId = UUID.randomUUID();
        when(jwtService.validateAndExtractUserId("token")).thenReturn(userId);

        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws/poker");
        servletRequest.setParameter("token", "token");
        ServletServerHttpRequest request = new ServletServerHttpRequest(servletRequest);
        ServletServerHttpResponse response = new ServletServerHttpResponse(new MockHttpServletResponse());
        WebSocketHandler handler = mock(WebSocketHandler.class);
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isTrue();
        assertThat(attributes.get("userId")).isEqualTo(userId);
    }

    @Test
    void beforeHandshake_rejectsInvalidToken() {
        WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwtService);
        when(jwtService.validateAndExtractUserId("bad")).thenThrow(new IllegalArgumentException("bad"));

        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws/poker");
        servletRequest.setParameter("token", "bad");
        ServletServerHttpRequest request = new ServletServerHttpRequest(servletRequest);
        ServletServerHttpResponse response = new ServletServerHttpResponse(new MockHttpServletResponse());
        WebSocketHandler handler = mock(WebSocketHandler.class);
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isFalse();
        assertThat(attributes).doesNotContainKey("userId");
    }

    @Test
    void beforeHandshake_rejectsMissingToken() {
        WebSocketAuthInterceptor interceptor = new WebSocketAuthInterceptor(jwtService);

        MockHttpServletRequest servletRequest = new MockHttpServletRequest("GET", "/ws/poker");
        ServletServerHttpRequest request = new ServletServerHttpRequest(servletRequest);
        ServletServerHttpResponse response = new ServletServerHttpResponse(new MockHttpServletResponse());
        WebSocketHandler handler = mock(WebSocketHandler.class);
        Map<String, Object> attributes = new HashMap<>();

        boolean accepted = interceptor.beforeHandshake(request, response, handler, attributes);

        assertThat(accepted).isFalse();
        assertThat(attributes).isEmpty();
    }
}

