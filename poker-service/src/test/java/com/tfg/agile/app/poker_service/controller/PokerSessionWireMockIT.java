package com.tfg.agile.app.poker_service.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.tfg.agile.app.poker_service.entity.ParticipantRole;
import com.tfg.agile.app.poker_service.entity.PokerParticipant;
import com.tfg.agile.app.poker_service.entity.PokerRound;
import com.tfg.agile.app.poker_service.entity.PokerSession;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import com.tfg.agile.app.poker_service.entity.SessionStatus;
import com.tfg.agile.app.poker_service.repository.PokerParticipantRepository;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import com.tfg.agile.app.poker_service.support.IntegrationTestBase;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;
import java.util.UUID;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.put;
import static com.github.tomakehurst.wiremock.client.WireMock.putRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlEqualTo;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

class PokerSessionWireMockIT extends IntegrationTestBase {

    private static final WireMockServer wireMock = new WireMockServer(wireMockConfig().dynamicPort());

    static {
        wireMock.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("app.project-service.url", wireMock::baseUrl);
        registry.add("app.user-service.url", wireMock::baseUrl);
        registry.add("app.task-service.url", wireMock::baseUrl);
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private PokerSessionRepository sessionRepository;

    @Autowired
    private PokerParticipantRepository participantRepository;

    @Autowired
    private PokerRoundRepository roundRepository;

    @Autowired
    private PokerSessionService pokerSessionService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        wireMock.resetAll();
    }

    @Test
    void createSessionPersistsAndNotifiesProjectMembers() throws Exception {
        UUID projectId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        UUID workspaceId = UUID.randomUUID();
        UUID teammateId = UUID.randomUUID();

        wireMock.stubFor(get(urlEqualTo("/internal/projects/" + projectId + "/member-ids"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("""
                                {
                                  "workspaceId":"%s",
                                  "memberUserIds":["%s","%s"]
                                }
                                """.formatted(workspaceId, creatorId, teammateId))));
        wireMock.stubFor(post(urlEqualTo("/internal/notifications/enqueue"))
                .willReturn(aResponse().withStatus(200)));

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(creatorId));

        ResponseEntity<Map> response = restTemplate.exchange(
                "/projects/{projectId}/poker/sessions",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("name", "Sprint planning", "deck", "FIBONACCI", "timerSeconds", 60), headers),
                Map.class,
                projectId
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        PokerSession session = sessionRepository.findAll().getFirst();
        assertThat(session.getProjectId()).isEqualTo(projectId);

        wireMock.verify(getRequestedFor(urlEqualTo("/internal/projects/" + projectId + "/member-ids"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key")));
        wireMock.verify(1, postRequestedFor(urlEqualTo("/internal/notifications/enqueue"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key"))
                .withRequestBody(matchingJsonPath("$.userId", equalTo(teammateId.toString())))
                .withRequestBody(matchingJsonPath("$.type", equalTo("POKER_INVITATION")))
                .withRequestBody(matchingJsonPath("$.actorUserId", equalTo(creatorId.toString()))));

        String notificationBody = wireMock.getServeEvents().getServeEvents().stream()
                .filter(event -> event.getRequest().getUrl().equals("/internal/notifications/enqueue"))
                .findFirst()
                .orElseThrow()
                .getRequest()
                .getBodyAsString();
        JsonNode payload = objectMapper.readTree(notificationBody);
        assertThat(payload.path("link").asText()).isEqualTo("/workspaces/" + workspaceId + "/projects/" + projectId + "/poker/" + session.getId());
        assertThat(payload.path("message").asText()).contains("Sprint planning");
    }

    @Test
    void acceptEstimateCallsTaskServiceAndResetsSessionState() {
        UUID projectId = UUID.randomUUID();
        UUID moderatorId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();

        wireMock.stubFor(put(urlEqualTo("/internal/tasks/" + taskId + "/story-points"))
                .willReturn(aResponse().withStatus(204)));

        PokerSession session = sessionRepository.save(PokerSession.builder()
                .projectId(projectId)
                .name("Sprint planning")
                .createdBy(moderatorId)
                .currentTaskId(taskId)
                .status(SessionStatus.REVEALED)
                .build());
        participantRepository.save(PokerParticipant.builder()
                .session(session)
                .userId(moderatorId)
                .displayName("Scrum Master")
                .role(ParticipantRole.MODERATOR)
                .build());
        PokerRound round = roundRepository.save(PokerRound.builder()
                .session(session)
                .taskId(taskId)
                .taskTitle("Estimate login flow")
                .status(RoundStatus.REVEALED)
                .build());

        var result = pokerSessionService.acceptEstimate(session.getId(), moderatorId, 5);

        assertThat(result.id()).isEqualTo(round.getId());
        assertThat(result.status()).isEqualTo(RoundStatus.CONSENSUS);
        assertThat(result.finalEstimate()).isEqualTo(5);
        assertThat(sessionRepository.findById(session.getId())).get()
                .extracting(PokerSession::getStatus, PokerSession::getCurrentTaskId)
                .containsExactly(SessionStatus.LOBBY, null);

        wireMock.verify(putRequestedFor(urlEqualTo("/internal/tasks/" + taskId + "/story-points"))
                .withHeader("X-Internal-Api-Key", equalTo("test-internal-key"))
                .withRequestBody(matchingJsonPath("$.storyPoints", equalTo("5"))));
    }
}
