package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.dto.RoundResponseDto;
import com.tfg.agile.app.poker_service.dto.SessionResponseDto;
import com.tfg.agile.app.poker_service.entity.*;
import com.tfg.agile.app.poker_service.exception.ForbiddenException;
import com.tfg.agile.app.poker_service.repository.PokerParticipantRepository;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.repository.PokerVoteRepository;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import com.tfg.agile.app.poker_service.support.TestDataFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.security.Principal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PokerWebSocketControllerTest {

    @Mock
    private PokerSessionService sessionService;
    @Mock
    private PokerRoundRepository roundRepository;
    @Mock
    private PokerVoteRepository voteRepository;
    @Mock
    private PokerParticipantRepository participantRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Test
    void vote_rejectsObservers() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.OBSERVER);

        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));

        controller.vote(sessionId, Map.of("value", "5"), headers(userId));

        verify(messagingTemplate).convertAndSendToUser(eq(userId.toString()), eq("/queue/poker/errors"), any());
        verify(voteRepository, never()).save(any(PokerVote.class));
    }

    @Test
    void vote_rejectsWhenNoActiveRound() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);

        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.empty());

        controller.vote(sessionId, Map.of("value", "5"), headers(userId));

        verify(messagingTemplate).convertAndSendToUser(eq(userId.toString()), eq("/queue/poker/errors"), any());
    }

    @Test
    void vote_updatesExistingVote() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);
        session.getParticipants().add(participant);

        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());
        PokerVote vote = TestDataFactory.vote(round, userId, "3");
        round.getVotes().add(vote);

        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.of(round));
        when(voteRepository.findByRoundIdAndUserId(round.getId(), userId)).thenReturn(Optional.of(vote));
        when(voteRepository.save(any(PokerVote.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roundRepository.findById(round.getId())).thenReturn(Optional.of(round));
        when(voteRepository.countByRoundId(round.getId())).thenReturn(0L);

        controller.vote(sessionId, Map.of("value", "5"), headers(userId));

        assertThat(vote.getValue()).isEqualTo("5");
        verify(messagingTemplate).convertAndSend(eq("/topic/poker/" + sessionId + "/votes"), (Object) any());
    }

    @Test
    void vote_autoRevealsWhenAllVoted() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), creatorId);
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);
        session.getParticipants().add(participant);

        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());
        PokerVote vote = TestDataFactory.vote(round, userId, "5");
        round.getVotes().add(vote);

        RoundResponseDto revealed = new RoundResponseDto(round.getId(), round.getTaskId(), round.getTaskTitle(),
                RoundStatus.REVEALED, null, List.of(), Instant.now(), Instant.now());

        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.of(round));
        when(voteRepository.findByRoundIdAndUserId(round.getId(), userId)).thenReturn(Optional.empty());
        when(voteRepository.save(any(PokerVote.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(roundRepository.findById(round.getId())).thenReturn(Optional.of(round));
        when(voteRepository.countByRoundId(round.getId())).thenReturn(1L);
        when(sessionService.revealRound(sessionId, creatorId)).thenReturn(revealed);

        controller.vote(sessionId, Map.of("value", "5"), headers(userId));

        verify(sessionService).revealRound(sessionId, creatorId);
        verify(messagingTemplate).convertAndSend(eq("/topic/poker/" + sessionId + "/reveal"), eq(revealed));
    }

    @Test
    void reveal_broadcastsRevealPayload() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        RoundResponseDto roundResponse = new RoundResponseDto(UUID.randomUUID(), UUID.randomUUID(),
                "Task", RoundStatus.REVEALED, 5, List.of(), Instant.now(), Instant.now());

        when(sessionService.revealRound(sessionId, userId)).thenReturn(roundResponse);

        controller.reveal(sessionId, headers(userId));

        verify(messagingTemplate).convertAndSend(eq("/topic/poker/" + sessionId + "/reveal"), eq(roundResponse));
    }

    @Test
    void acceptAndNext_broadcastsSessionState() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        SessionResponseDto sessionResponse = new SessionResponseDto(sessionId, UUID.randomUUID(), "Session",
                SessionStatus.LOBBY, DeckType.FIBONACCI, userId, null, List.of(), Instant.now(), Instant.now());

        when(sessionService.getSession(sessionId)).thenReturn(sessionResponse);

        controller.acceptAndNext(sessionId, Map.of("finalEstimate", 8), headers(userId));

        verify(sessionService).acceptEstimate(sessionId, userId, 8);
        verify(messagingTemplate).convertAndSend(eq("/topic/poker/" + sessionId + "/state"), eq(sessionResponse));
    }

    @Test
    void revote_broadcastsSessionState() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        SessionResponseDto sessionResponse = new SessionResponseDto(sessionId, UUID.randomUUID(), "Session",
                SessionStatus.VOTING, DeckType.FIBONACCI, userId, null, List.of(), Instant.now(), Instant.now());

        when(sessionService.getSession(sessionId)).thenReturn(sessionResponse);

        controller.revote(sessionId, headers(userId));

        verify(sessionService).revote(sessionId, userId);
        verify(messagingTemplate).convertAndSend(eq("/topic/poker/" + sessionId + "/state"), eq(sessionResponse));
    }

    @Test
    void handlers_requireAuthenticatedUser() {
        PokerWebSocketController controller = new PokerWebSocketController(
                sessionService, roundRepository, voteRepository, participantRepository, messagingTemplate);

        assertThatThrownBy(() -> controller.reveal(UUID.randomUUID(), SimpMessageHeaderAccessor.create()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("Not authenticated");
    }

    private SimpMessageHeaderAccessor headers(UUID userId) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        Principal principal = userId::toString;
        accessor.setUser(principal);
        return accessor;
    }
}
