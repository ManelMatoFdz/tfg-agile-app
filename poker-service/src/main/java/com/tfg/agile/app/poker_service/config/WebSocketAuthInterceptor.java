package com.tfg.agile.app.poker_service.config;

import com.tfg.agile.app.poker_service.security.JwtService;
import com.tfg.agile.app.poker_service.security.TokenVersionClient;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;
import java.util.OptionalInt;
import java.util.UUID;

public class WebSocketAuthInterceptor implements HandshakeInterceptor {

    private final JwtService jwtService;
    private final TokenVersionClient tokenVersionClient;

    public WebSocketAuthInterceptor(JwtService jwtService, TokenVersionClient tokenVersionClient) {
        this.jwtService = jwtService;
        this.tokenVersionClient = tokenVersionClient;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        if (request instanceof ServletServerHttpRequest servletRequest) {
            String token = servletRequest.getServletRequest().getParameter("token");
            if (token != null) {
                try {
                    JwtService.JwtClaims claims = jwtService.validateAndExtract(token);

                    OptionalInt stored = tokenVersionClient.getTokenVersion(claims.userId());
                    if (stored.isPresent() && stored.getAsInt() != claims.tokenVersion()) {
                        return false;
                    }

                    attributes.put("userId", claims.userId());
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }
        }
        return false;
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // no-op
    }
}