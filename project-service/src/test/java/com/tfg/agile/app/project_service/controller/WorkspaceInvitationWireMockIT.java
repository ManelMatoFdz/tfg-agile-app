package com.tfg.agile.app.project_service.controller;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.tfg.agile.app.project_service.entity.InvitationStatus;
import com.tfg.agile.app.project_service.entity.Workspace;
import com.tfg.agile.app.project_service.entity.WorkspaceMember;
import com.tfg.agile.app.project_service.entity.WorkspaceRole;
import com.tfg.agile.app.project_service.repository.WorkspaceInvitationRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceMemberRepository;
import com.tfg.agile.app.project_service.repository.WorkspaceRepository;
import com.tfg.agile.app.project_service.support.IntegrationTestBase;
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
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlMatching;
import static com.github.tomakehurst.wiremock.core.WireMockConfiguration.wireMockConfig;
import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceInvitationWireMockIT extends IntegrationTestBase {

    private static final WireMockServer wireMock = new WireMockServer(wireMockConfig().dynamicPort());

    static {
        wireMock.start();
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("app.user-service.url", wireMock::baseUrl);
    }

    @AfterAll
    static void stopWireMock() {
        wireMock.stop();
    }

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private WorkspaceMemberRepository workspaceMemberRepository;

    @Autowired
    private WorkspaceInvitationRepository invitationRepository;

    @BeforeEach
    void setUp() {
        wireMock.resetAll();
        wireMock.stubFor(get(urlMatching("/internal/users/.*/token-version"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"tokenVersion\":0}")));
    }

    @Test
    void createInvitationPersistsInvitation() {
        UUID callerId = UUID.randomUUID();
        UUID invitedUserId = UUID.randomUUID();
        Workspace workspace = workspaceRepository.save(Workspace.builder()
                .name("Acme")
                .description("Main workspace")
                .ownerId(callerId)
                .build());
        workspaceMemberRepository.save(WorkspaceMember.builder()
                .workspace(workspace)
                .userId(callerId)
                .role(WorkspaceRole.ADMIN)
                .build());

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtFor(callerId));

        ResponseEntity<Map> response = restTemplate.exchange(
                "/workspaces/{workspaceId}/invitations",
                HttpMethod.POST,
                new HttpEntity<>(Map.of("userId", invitedUserId, "email", "ada@example.com"), headers),
                Map.class,
                workspace.getId()
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(invitationRepository.findAll())
                .singleElement()
                .extracting(invitation -> invitation.getInvitedUserId(), invitation -> invitation.getStatus())
                .containsExactly(invitedUserId, InvitationStatus.PENDING);
    }
}
