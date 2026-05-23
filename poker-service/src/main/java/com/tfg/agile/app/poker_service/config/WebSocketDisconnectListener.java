package com.tfg.agile.app.poker_service.config;

import com.tfg.agile.app.poker_service.service.PokerSessionService;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.UUID;

@Component
public class WebSocketDisconnectListener {

    private final PokerSessionService sessionService;
    private final DisconnectScheduler disconnectScheduler;
    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketDisconnectListener(PokerSessionService sessionService,
                                       DisconnectScheduler disconnectScheduler,
                                       SimpMessagingTemplate messagingTemplate) {
        this.sessionService = sessionService;
        this.disconnectScheduler = disconnectScheduler;
        this.messagingTemplate = messagingTemplate;
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        if (accessor.getUser() == null) return;

        UUID userId;
        try {
            userId = UUID.fromString(accessor.getUser().getName());
        } catch (IllegalArgumentException e) {
            return;
        }

        // Delay the actual disconnect to allow browser refreshes to reconnect first.
        // If joinSession is called within the grace period, this task is cancelled.
        disconnectScheduler.schedule(userId, () -> {
            var disconnected = sessionService.disconnectUser(userId);
            disconnected.forEach((sessionId, participants) ->
                    messagingTemplate.convertAndSend("/topic/poker/" + sessionId + "/participants", participants));
        });
    }
}