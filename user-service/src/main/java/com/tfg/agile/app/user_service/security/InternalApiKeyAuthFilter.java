package com.tfg.agile.app.user_service.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Component
public class InternalApiKeyAuthFilter extends OncePerRequestFilter {

    private static final String INTERNAL_API_KEY_HEADER = "X-Internal-Api-Key";

    private final String internalApiKey;

    public InternalApiKeyAuthFilter(@Value("${app.internal.api-key:dev-internal-key}") String internalApiKey) {
        this.internalApiKey = internalApiKey;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/internal/")) {
            filterChain.doFilter(request, response);
            return;
        }

        if (hasBearerAuthorization(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String providedApiKey = request.getHeader(INTERNAL_API_KEY_HEADER);
        if (constantTimeEquals(internalApiKey, providedApiKey)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    "internal-service",
                    null,
                    List.of(() -> "ROLE_INTERNAL")
            );
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        }

        filterChain.doFilter(request, response);
    }

    private static boolean hasBearerAuthorization(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        return header != null && header.startsWith("Bearer ");
    }

    private static boolean constantTimeEquals(String expected, String provided) {
        if (expected == null || provided == null) {
            return false;
        }
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] providedBytes = provided.getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expectedBytes, providedBytes);
    }
}
