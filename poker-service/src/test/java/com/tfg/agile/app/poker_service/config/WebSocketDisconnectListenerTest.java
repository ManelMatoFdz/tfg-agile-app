package com.tfg.agile.app.poker_service.config;

import com.tfg.agile.app.poker_service.service.PokerSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class WebSocketDisconnectListenerTest {

    @Mock
    private PokerSessionService sessionService;

    @Mock
    private DisconnectScheduler disconnectScheduler;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private WebSocketDisconnectListener listener;

    @BeforeEach
    void setUp() {
        listener = new WebSocketDisconnectListener(sessionService, disconnectScheduler, messagingTemplate);
    }

    @Test
    void handleDisconnect_schedulesDisconnectForValidUser() {
        UUID userId = UUID.randomUUID();
        var accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setUser(new Principal() {
            public String getName() { return userId.toString(); }
        });
        accessor.setSessionId("session-1");
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        var event = new SessionDisconnectEvent(this, message, "session-1", CloseStatus.NORMAL);

        listener.handleDisconnect(event);

        verify(disconnectScheduler).schedule(eq(userId), any(Runnable.class));
    }

    @Test
    void handleDisconnect_ignoresWhenNoUser() {
        var accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setSessionId("session-1");
        // No user set
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        var event = new SessionDisconnectEvent(this, message, "session-1", CloseStatus.NORMAL);

        listener.handleDisconnect(event);

        verify(disconnectScheduler, never()).schedule(any(UUID.class), any(Runnable.class));
    }

    @Test
    void handleDisconnect_ignoresWhenInvalidUserId() {
        var accessor = StompHeaderAccessor.create(StompCommand.DISCONNECT);
        accessor.setUser(new Principal() {
            public String getName() { return "not-a-uuid"; }
        });
        accessor.setSessionId("session-1");
        var message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        var event = new SessionDisconnectEvent(this, message, "session-1", CloseStatus.NORMAL);

        listener.handleDisconnect(event);

        verify(disconnectScheduler, never()).schedule(any(UUID.class), any(Runnable.class));
    }
}