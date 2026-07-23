package com.tfg.agile.app.poker_service.config;

import com.tfg.agile.app.poker_service.security.JwtService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.config.SimpleBrokerRegistration;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;
import org.springframework.web.socket.server.HandshakeInterceptor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isA;
import static org.mockito.Mockito.RETURNS_SELF;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WebSocketConfigTest {

    @Test
    void configureMessageBroker_setsExpectedPrefixes() {
        JwtService jwtService = mock(JwtService.class);
        WebSocketConfig config = new WebSocketConfig(jwtService);
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class, RETURNS_SELF);
        SimpleBrokerRegistration brokerReg = mock(SimpleBrokerRegistration.class, RETURNS_SELF);

        when(registry.enableSimpleBroker("/topic", "/queue")).thenReturn(brokerReg);

        config.configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic", "/queue");
        verify(brokerReg).setHeartbeatValue(new long[]{10000, 10000});
        verify(registry).setApplicationDestinationPrefixes("/app");
        verify(registry).setUserDestinationPrefix("/user");
    }

    @Test
    void registerStompEndpoints_registersPokerEndpoint() {
        JwtService jwtService = mock(JwtService.class);
        WebSocketConfig config = new WebSocketConfig(jwtService);
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration registration = mock(StompWebSocketEndpointRegistration.class, RETURNS_SELF);

        when(registry.addEndpoint(eq("/ws/poker"))).thenReturn(registration);

        config.registerStompEndpoints(registry);

        verify(registry).addEndpoint("/ws/poker");
        verify(registration).setAllowedOriginPatterns("*");
        verify(registration).addInterceptors(any(HandshakeInterceptor.class));
        verify(registration).withSockJS();
    }

    @Test
    void configureClientInboundChannel_registersChannelInterceptor() {
        JwtService jwtService = mock(JwtService.class);
        WebSocketConfig config = new WebSocketConfig(jwtService);
        ChannelRegistration registration = mock(ChannelRegistration.class, RETURNS_SELF);

        config.configureClientInboundChannel(registration);

        verify(registration).interceptors(isA(WebSocketChannelInterceptor.class));
    }
}

