package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.entity.PokerSession;
import com.tfg.agile.app.poker_service.entity.SessionStatus;
import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import com.tfg.agile.app.poker_service.support.IntegrationTestBase;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PokerSessionControllerIT extends IntegrationTestBase {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private PokerSessionRepository sessionRepository;

    @Test
    void createSessionRequiresJwt() {
        ResponseEntity<String> response = restTemplate.postForEntity(
                "/projects/{projectId}/poker/sessions",
                Map.of("name", "Sprint planning", "deck", "FIBONACCI", "timerSeconds", 90),
                String.class,
                UUID.randomUUID()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void joinAndStartRoundPersistPokerState() {
        UUID projectId = UUID.randomUUID();
        UUID moderatorId = UUID.randomUUID();

        PokerSession session = sessionRepository.save(PokerSession.builder()
                .projectId(projectId)
                .name("Sprint planning")
                .createdBy(moderatorId)
                .timerSeconds(60)
                .build());

        HttpHeaders headers = bearer(moderatorId);

        ResponseEntity<Map> joinResponse = restTemplate.exchange(
                "/poker/sessions/{sessionId}/join",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("displayName", "Scrum Master", "role", "MODERATOR"), headers),
                Map.class,
                session.getId()
        );

        ResponseEntity<Map> roundResponse = restTemplate.exchange(
                "/poker/sessions/{sessionId}/rounds",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("taskId", UUID.randomUUID(), "taskTitle", "Estimate login flow"), headers),
                Map.class,
                session.getId()
        );

        assertThat(joinResponse.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(roundResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(sessionRepository.findById(session.getId())).get()
                .extracting(PokerSession::getStatus)
                .isEqualTo(SessionStatus.VOTING);
    }

    private HttpHeaders bearer(UUID userId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(userId));
        return headers;
    }
}
