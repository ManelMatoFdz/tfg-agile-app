package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.dto.CreateSessionRequestDto;
import com.tfg.agile.app.poker_service.dto.JoinSessionRequestDto;
import com.tfg.agile.app.poker_service.dto.ParticipantDto;
import com.tfg.agile.app.poker_service.dto.RoundResponseDto;
import com.tfg.agile.app.poker_service.dto.SessionResponseDto;
import com.tfg.agile.app.poker_service.dto.StartRoundRequestDto;
import com.tfg.agile.app.poker_service.entity.DeckType;
import com.tfg.agile.app.poker_service.entity.ParticipantRole;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import com.tfg.agile.app.poker_service.entity.SessionStatus;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PokerSessionControllerTest {

    @Mock
    private PokerSessionService service;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void endpoints_delegateToService() {
        PokerSessionController controller = new PokerSessionController(service, messagingTemplate);
        UUID projectId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        CreateSessionRequestDto createRequest = new CreateSessionRequestDto("Session", DeckType.FIBONACCI);
        JoinSessionRequestDto joinRequest = new JoinSessionRequestDto("User", ParticipantRole.VOTER);
        StartRoundRequestDto startRoundRequest = new StartRoundRequestDto(UUID.randomUUID(), "Task");

        SessionResponseDto sessionResponse = new SessionResponseDto(
                sessionId, projectId, "Session", SessionStatus.LOBBY, DeckType.FIBONACCI,
                userId, null, List.of(), Instant.now(), Instant.now()
        );

        ParticipantDto participantDto = new ParticipantDto(UUID.randomUUID(), userId, "User",
                ParticipantRole.VOTER, true, Instant.now());

        RoundResponseDto roundResponse = new RoundResponseDto(UUID.randomUUID(), startRoundRequest.taskId(),
                startRoundRequest.taskTitle(), RoundStatus.VOTING, null, List.of(), Instant.now(), null);

        when(service.createSession(projectId, userId, createRequest)).thenReturn(sessionResponse);
        when(service.listSessions(projectId)).thenReturn(List.of(sessionResponse));
        when(service.getSession(sessionId)).thenReturn(sessionResponse);
        when(service.joinSession(sessionId, userId, joinRequest)).thenReturn(participantDto);
        when(service.startRound(sessionId, userId, startRoundRequest)).thenReturn(roundResponse);
        when(service.getRounds(sessionId)).thenReturn(List.of(roundResponse));

        assertThat(controller.createSession(projectId, userId, createRequest).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.listSessions(projectId)).hasSize(1);
        assertThat(controller.getSession(sessionId)).isEqualTo(sessionResponse);
        assertThat(controller.joinSession(sessionId, userId, joinRequest).getBody()).isEqualTo(participantDto);
        assertThat(controller.startRound(sessionId, userId, startRoundRequest).getStatusCode().value()).isEqualTo(201);
        assertThat(controller.getRounds(sessionId)).hasSize(1);

        controller.leaveSession(sessionId, userId);
        controller.closeSession(sessionId, userId);

        verify(service).leaveSession(sessionId, userId);
        verify(service).closeSession(sessionId, userId);
    }
}

