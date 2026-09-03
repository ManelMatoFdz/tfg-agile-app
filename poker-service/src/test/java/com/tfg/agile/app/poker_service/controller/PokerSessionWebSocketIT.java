package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.entity.PokerSession;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import com.tfg.agile.app.poker_service.repository.PokerVoteRepository;
import com.tfg.agile.app.poker_service.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

class PokerSessionWebSocketIT extends IntegrationTestBase {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private PokerSessionRepository sessionRepository;

    @Autowired
    private PokerRoundRepository roundRepository;

    @Autowired
    private PokerVoteRepository voteRepository;

    @Test
    void websocketFlowConnectsTwoParticipantsVotesAndReveals() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID moderatorId = UUID.randomUUID();
        UUID voterId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        PokerSession session = sessionRepository.save(PokerSession.builder()
                .projectId(projectId)
                .name("Sprint planning")
                .createdBy(moderatorId)
                .timerSeconds(0)
                .build());

        assertThat(joinSession(session.getId(), moderatorId, "Scrum Master", "MODERATOR").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(joinSession(session.getId(), voterId, "Developer", "VOTER").getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(startRound(session.getId(), moderatorId, taskId).getStatusCode()).isEqualTo(HttpStatus.CREATED);

        WebSocketStompClient stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new MappingJackson2MessageConverter());

        StompSession moderatorSession = null;
        StompSession voterSession = null;

        try {
            moderatorSession = connect(stompClient, moderatorId);
            voterSession = connect(stompClient, voterId);

            BlockingQueue<Map<?, ?>> voteStatuses = new LinkedBlockingQueue<>();
            BlockingQueue<Map<?, ?>> revealedRounds = new LinkedBlockingQueue<>();

            moderatorSession.subscribe("/topic/poker/" + session.getId() + "/votes", mapHandler(voteStatuses));
            moderatorSession.subscribe("/topic/poker/" + session.getId() + "/reveal", mapHandler(revealedRounds));

            // Allow subscriptions to be registered on the server
            Thread.sleep(500);

            voterSession.send("/app/poker/" + session.getId() + "/vote", Map.of("value", "8"));

            Map<?, ?> voteStatus = voteStatuses.poll(10, TimeUnit.SECONDS);
            assertThat(voteStatus).isNotNull();
            assertThat(voteStatus.get(voterId.toString())).isEqualTo(true);

            moderatorSession.send("/app/poker/" + session.getId() + "/reveal", Map.of());

            Map<?, ?> revealed = revealedRounds.poll(10, TimeUnit.SECONDS);
            assertThat(revealed).isNotNull();
            assertThat(revealed.get("status")).isEqualTo("REVEALED");

            assertThat(roundRepository.findBySessionIdAndStatus(session.getId(), RoundStatus.REVEALED)).isPresent();

            UUID roundId = UUID.fromString((String) revealed.get("id"));
            assertThat(voteRepository.countByRoundId(roundId)).isEqualTo(1);
        } finally {
            if (moderatorSession != null && moderatorSession.isConnected()) {
                moderatorSession.disconnect();
            }
            if (voterSession != null && voterSession.isConnected()) {
                voterSession.disconnect();
            }
            stompClient.stop();
        }
    }

    private StompFrameHandler mapHandler(BlockingQueue<Map<?, ?>> queue) {
        return new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return Map.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.offer((Map<?, ?>) payload);
            }
        };
    }

    private ResponseEntity<Map> joinSession(UUID sessionId, UUID userId, String displayName, String role) {
        return restTemplate.exchange(
                "/poker/sessions/{sessionId}/join",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("displayName", displayName, "role", role), bearer(userId)),
                Map.class,
                sessionId
        );
    }

    private ResponseEntity<Map> startRound(UUID sessionId, UUID moderatorId, UUID taskId) {
        return restTemplate.exchange(
                "/poker/sessions/{sessionId}/rounds",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("taskId", taskId, "taskTitle", "Estimate login flow"), bearer(moderatorId)),
                Map.class,
                sessionId
        );
    }

    private StompSession connect(WebSocketStompClient stompClient, UUID userId) throws Exception {
        String url = "ws://localhost:" + port + "/ws/poker/websocket?token=" + jwtFor(userId);
        CompletableFuture<StompSession> future = stompClient.connectAsync(url, new StompSessionHandlerAdapter() {
        });
        return future.get(10, TimeUnit.SECONDS);
    }

    private HttpHeaders bearer(UUID userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(userId));
        return headers;
    }
}
