package com.tfg.agile.app.poker_service.config;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

public class WebSocketChannelInterceptor implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
            if (sessionAttributes != null && sessionAttributes.containsKey("userId")) {
                UUID userId = (UUID) sessionAttributes.get("userId");
                accessor.setUser(new StompPrincipal(userId));
            }
        }
        return message;
    }

    private record StompPrincipal(UUID userId) implements Principal {
        @Override
        public String getName() {
            return userId.toString();
        }
    }
}