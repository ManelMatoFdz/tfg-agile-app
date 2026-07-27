package com.tfg.agile.app.poker_service.service;

import com.tfg.agile.app.poker_service.client.ProjectServiceClient;
import com.tfg.agile.app.poker_service.client.TaskServiceClient;
import com.tfg.agile.app.poker_service.client.UserServiceClient;
import com.tfg.agile.app.poker_service.config.DisconnectScheduler;
import com.tfg.agile.app.poker_service.dto.CreateSessionRequestDto;
import com.tfg.agile.app.poker_service.dto.JoinSessionRequestDto;
import com.tfg.agile.app.poker_service.dto.SelectTaskRequestDto;
import com.tfg.agile.app.poker_service.dto.StartRoundRequestDto;
import com.tfg.agile.app.poker_service.dto.UpdateTimerRequestDto;
import com.tfg.agile.app.poker_service.entity.*;
import com.tfg.agile.app.poker_service.exception.ConflictException;
import com.tfg.agile.app.poker_service.exception.ForbiddenException;
import com.tfg.agile.app.poker_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.poker_service.repository.PokerParticipantRepository;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import com.tfg.agile.app.poker_service.repository.PokerVoteRepository;
import com.tfg.agile.app.poker_service.support.TestDataFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PokerSessionServiceTest {

    @Mock
    private PokerSessionRepository sessionRepository;
    @Mock
    private PokerParticipantRepository participantRepository;
    @Mock
    private PokerRoundRepository roundRepository;
    @Mock
    private PokerVoteRepository voteRepository;
    @Mock
    private TaskServiceClient taskServiceClient;
    @Mock
    private ProjectServiceClient projectServiceClient;
    @Mock
    private UserServiceClient userServiceClient;
    @Mock
    private DisconnectScheduler disconnectScheduler;

    private PokerSessionService service;

    @BeforeEach
    void setUp() {
        service = new PokerSessionService(sessionRepository, participantRepository, roundRepository, voteRepository, taskServiceClient, projectServiceClient, userServiceClient, disconnectScheduler);
    }

    @Test
    void createSession_persistsAndReturnsDto() {
        UUID projectId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> {
            PokerSession session = invocation.getArgument(0);
            session.setId(UUID.randomUUID());
            return session;
        });

        var response = service.createSession(projectId, userId, new CreateSessionRequestDto("Planning", null, null));

        assertThat(response.projectId()).isEqualTo(projectId);
        assertThat(response.createdBy()).isEqualTo(userId);
        assertThat(response.deck()).isEqualTo(DeckType.FIBONACCI);
    }

    @Test
    void listSessions_returnsDtos() {
        UUID projectId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(projectId, UUID.randomUUID());

        when(sessionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)).thenReturn(List.of(session));

        assertThat(service.listSessions(projectId)).hasSize(1);
    }

    @Test
    void getSession_throwsWhenMissing() {
        UUID sessionId = UUID.randomUUID();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSession(sessionId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("SESSION_NOT_FOUND");
    }

    @Test
    void joinSession_reconnectsExistingParticipant() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);
        participant.setConnected(false);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.existsBySessionIdAndUserId(sessionId, userId)).thenReturn(true);
        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));
        when(participantRepository.save(any(PokerParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.joinSession(sessionId, userId, new JoinSessionRequestDto("User", null));

        assertThat(response.connected()).isTrue();
    }

    @Test
    void joinSession_createsNewParticipant() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(participantRepository.existsBySessionIdAndUserId(sessionId, userId)).thenReturn(false);
        when(participantRepository.save(any(PokerParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.joinSession(sessionId, userId, new JoinSessionRequestDto("User", ParticipantRole.OBSERVER));

        assertThat(response.displayName()).isEqualTo("User");
        assertThat(response.role()).isEqualTo(ParticipantRole.OBSERVER);
    }

    @Test
    void joinSession_throwsWhenSessionClosed() {
        UUID sessionId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        session.setStatus(SessionStatus.CLOSED);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.joinSession(sessionId, UUID.randomUUID(), new JoinSessionRequestDto("User", null)))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SESSION_CLOSED");
    }

    @Test
    void leaveSession_deletesParticipant() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);

        when(participantRepository.findBySessionIdAndUserId(sessionId, userId)).thenReturn(Optional.of(participant));

        service.leaveSession(sessionId, userId);

        verify(participantRepository).delete(participant);
    }

    @Test
    void closeSession_requiresCreator() {
        UUID sessionId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.closeSession(sessionId, UUID.randomUUID()))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_MODERATOR_REQUIRED");
    }

    @Test
    void closeSession_updatesStatus() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.closeSession(sessionId, userId);

        assertThat(response.status()).isEqualTo(SessionStatus.CLOSED);
    }

    @Test
    void startRound_requiresFacilitator() {
        UUID sessionId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.startRound(sessionId, UUID.randomUUID(),
                new StartRoundRequestDto(UUID.randomUUID(), "Task")))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }

    @Test
    void startRound_createsVotingRound() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.empty());
        when(roundRepository.save(any(PokerRound.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.startRound(sessionId, userId, new StartRoundRequestDto(taskId, "Task"));

        assertThat(response.taskId()).isEqualTo(taskId);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.VOTING);
        assertThat(session.getCurrentTaskId()).isEqualTo(taskId);
    }

    @Test
    void revealRound_throwsWhenNoVotingRound() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.revealRound(sessionId, userId))
                .isInstanceOf(ConflictException.class)
                .hasMessage("NO_ACTIVE_ROUND");
    }

    @Test
    void revealRound_updatesSessionAndRound() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));
        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.of(round));
        when(roundRepository.save(any(PokerRound.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.revealRound(sessionId, userId);

        assertThat(response.status()).isEqualTo(RoundStatus.REVEALED);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.REVEALED);
    }

    @Test
    void acceptEstimate_updatesRoundAndStoryPoints() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));
        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());
        round.setStatus(RoundStatus.REVEALED);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.REVEALED)).thenReturn(Optional.of(round));
        when(roundRepository.save(any(PokerRound.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.acceptEstimate(sessionId, userId, 8);

        assertThat(response.status()).isEqualTo(RoundStatus.CONSENSUS);
        assertThat(session.getStatus()).isEqualTo(SessionStatus.LOBBY);
        verify(taskServiceClient).updateStoryPoints(round.getTaskId(), 8);
    }

    @Test
    void acceptEstimate_skipsStoryPointsWhenNull() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));
        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());
        round.setStatus(RoundStatus.REVEALED);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.REVEALED)).thenReturn(Optional.of(round));
        when(roundRepository.save(any(PokerRound.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.acceptEstimate(sessionId, userId, null);

        verify(taskServiceClient, never()).updateStoryPoints(any(UUID.class), anyInt());
    }

    @Test
    void revote_createsNewRound() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.getParticipants().add(TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR));
        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());
        round.setStatus(RoundStatus.REVEALED);
        round.setFinalEstimate(5);

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.REVEALED)).thenReturn(Optional.of(round));
        when(roundRepository.save(any(PokerRound.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.revote(sessionId, userId);

        assertThat(response.taskId()).isEqualTo(round.getTaskId());
        assertThat(session.getStatus()).isEqualTo(SessionStatus.VOTING);
        ArgumentCaptor<PokerRound> captor = ArgumentCaptor.forClass(PokerRound.class);
        verify(roundRepository, org.mockito.Mockito.times(2)).save(captor.capture());
        assertThat(captor.getAllValues().stream().anyMatch(saved -> saved.getStatus() == RoundStatus.CONSENSUS)).isTrue();
    }

    @Test
    void getRounds_returnsOrderedRounds() {
        UUID sessionId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerRound round = TestDataFactory.round(session, UUID.randomUUID());

        when(roundRepository.findBySessionIdOrderByStartedAtAsc(sessionId)).thenReturn(List.of(round));

        assertThat(service.getRounds(sessionId)).hasSize(1);
    }

    @Test
    void updateTimer_setsTimerSeconds() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        PokerParticipant moderator = TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR);
        session.setParticipants(new ArrayList<>(List.of(moderator)));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.updateTimer(sessionId, userId, new UpdateTimerRequestDto(30));

        assertThat(session.getTimerSeconds()).isEqualTo(30);
        verify(sessionRepository).save(session);
    }

    @Test
    void updateTimer_throwsWhenNotFacilitator() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.updateTimer(sessionId, userId, new UpdateTimerRequestDto(30)))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }

    @Test
    void selectTask_setsCurrentTaskId() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID taskId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        PokerParticipant moderator = TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR);
        session.setParticipants(new ArrayList<>(List.of(moderator)));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(PokerSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.selectTask(sessionId, userId, new SelectTaskRequestDto(taskId));

        assertThat(session.getCurrentTaskId()).isEqualTo(taskId);
    }

    @Test
    void selectTask_throwsWhenSessionClosed() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        session.setStatus(SessionStatus.CLOSED);
        PokerParticipant moderator = TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR);
        session.setParticipants(new ArrayList<>(List.of(moderator)));

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.selectTask(sessionId, userId, new SelectTaskRequestDto(UUID.randomUUID())))
                .isInstanceOf(ConflictException.class)
                .hasMessage("SESSION_CLOSED");
    }

    @Test
    void selectTask_throwsWhenNotFacilitator() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.selectTask(sessionId, userId, new SelectTaskRequestDto(UUID.randomUUID())))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }

    @Test
    void disconnectUser_setsConnectedFalse() {
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());
        PokerParticipant participant = TestDataFactory.participant(session, userId, ParticipantRole.VOTER);
        assertThat(participant.isConnected()).isTrue();

        when(participantRepository.findByUserIdAndConnectedTrue(userId)).thenReturn(List.of(participant));
        when(participantRepository.save(any(PokerParticipant.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(participantRepository.findBySessionId(session.getId())).thenReturn(List.of(participant));

        var result = service.disconnectUser(userId);

        assertThat(participant.isConnected()).isFalse();
        assertThat(result).containsKey(session.getId());
    }

    @Test
    void disconnectUser_returnsEmptyMapWhenNoConnectedParticipants() {
        UUID userId = UUID.randomUUID();

        when(participantRepository.findByUserIdAndConnectedTrue(userId)).thenReturn(Collections.emptyList());

        var result = service.disconnectUser(userId);

        assertThat(result).isEmpty();
    }

    @Test
    void startRound_throwsWhenRoundAlreadyActive() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), userId);
        PokerParticipant moderator = TestDataFactory.participant(session, userId, ParticipantRole.MODERATOR);
        session.setParticipants(new ArrayList<>(List.of(moderator)));
        PokerRound activeRound = TestDataFactory.round(session, UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)).thenReturn(Optional.of(activeRound));

        assertThatThrownBy(() -> service.startRound(sessionId, userId,
                new StartRoundRequestDto(UUID.randomUUID(), "Task")))
                .isInstanceOf(ConflictException.class)
                .hasMessage("ROUND_ALREADY_ACTIVE");
    }

    @Test
    void revealRound_throwsWhenNotFacilitator() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.revealRound(sessionId, userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }

    @Test
    void acceptEstimate_throwsWhenNotFacilitator() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.acceptEstimate(sessionId, userId, 5))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }

    @Test
    void revote_throwsWhenNotFacilitator() {
        UUID sessionId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PokerSession session = TestDataFactory.session(UUID.randomUUID(), UUID.randomUUID());

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.revote(sessionId, userId))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("SESSION_FACILITATOR_REQUIRED");
    }
}
