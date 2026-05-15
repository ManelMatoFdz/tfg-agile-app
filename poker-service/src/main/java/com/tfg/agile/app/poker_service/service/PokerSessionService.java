package com.tfg.agile.app.poker_service.service;

import com.tfg.agile.app.poker_service.client.TaskServiceClient;
import com.tfg.agile.app.poker_service.dto.*;
import com.tfg.agile.app.poker_service.entity.*;
import com.tfg.agile.app.poker_service.exception.ConflictException;
import com.tfg.agile.app.poker_service.exception.ForbiddenException;
import com.tfg.agile.app.poker_service.exception.ResourceNotFoundException;
import com.tfg.agile.app.poker_service.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PokerSessionService {

    private final PokerSessionRepository sessionRepository;
    private final PokerParticipantRepository participantRepository;
    private final PokerRoundRepository roundRepository;
    private final PokerVoteRepository voteRepository;
    private final TaskServiceClient taskServiceClient;

    public PokerSessionService(PokerSessionRepository sessionRepository,
                               PokerParticipantRepository participantRepository,
                               PokerRoundRepository roundRepository,
                               PokerVoteRepository voteRepository,
                               TaskServiceClient taskServiceClient) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.roundRepository = roundRepository;
        this.voteRepository = voteRepository;
        this.taskServiceClient = taskServiceClient;
    }
    
    public SessionResponseDto createSession(UUID projectId, UUID userId, CreateSessionRequestDto dto) {
        var session = PokerSession.builder()
                .projectId(projectId)
                .name(dto.name())
                .deck(dto.deck())
                .createdBy(userId)
                .build();
        session = sessionRepository.save(session);
        return toDto(session);
    }

    @Transactional(readOnly = true)
    public List<SessionResponseDto> listSessions(UUID projectId) {
        return sessionRepository.findByProjectIdOrderByCreatedAtDesc(projectId)
                .stream().map(this::toDto).toList();
    }

    @Transactional(readOnly = true)
    public SessionResponseDto getSession(UUID sessionId) {
        return toDto(findSession(sessionId));
    }
    
    public ParticipantDto joinSession(UUID sessionId, UUID userId, JoinSessionRequestDto dto) {
        var session = findSession(sessionId);
        if (session.getStatus() == SessionStatus.CLOSED) {
            throw new ConflictException("SESSION_CLOSED");
        }
        if (participantRepository.existsBySessionIdAndUserId(sessionId, userId)) {
            // Re-connect existing participant
            var existing = participantRepository.findBySessionIdAndUserId(sessionId, userId).get();
            existing.setConnected(true);
            return toParticipantDto(participantRepository.save(existing));
        }
        var participant = PokerParticipant.builder()
                .session(session)
                .userId(userId)
                .displayName(dto.displayName())
                .role(dto.role())
                .build();
        return toParticipantDto(participantRepository.save(participant));
    }

    public void leaveSession(UUID sessionId, UUID userId) {
        var participant = participantRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("PARTICIPANT_NOT_FOUND"));
        participant.setConnected(false);
        participantRepository.save(participant);
    }
    
    public SessionResponseDto closeSession(UUID sessionId, UUID userId) {
        var session = findSession(sessionId);
        if (!session.getCreatedBy().equals(userId)) {
            throw new ForbiddenException("SESSION_CREATOR_REQUIRED");
        }
        if (session.getStatus() == SessionStatus.CLOSED) {
            throw new ConflictException("SESSION_ALREADY_CLOSED");
        }
        session.setStatus(SessionStatus.CLOSED);
        return toDto(sessionRepository.save(session));
    }
    
    public RoundResponseDto startRound(UUID sessionId, UUID userId, StartRoundRequestDto dto) {
        var session = findSession(sessionId);
        assertFacilitator(session, userId);

        if (session.getStatus() == SessionStatus.CLOSED) {
            throw new ConflictException("SESSION_CLOSED");
        }

        roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)
                .ifPresent(r -> { throw new ConflictException("ROUND_ALREADY_ACTIVE"); });

        var round = PokerRound.builder()
                .session(session)
                .taskId(dto.taskId())
                .taskTitle(dto.taskTitle())
                .build();
        round = roundRepository.save(round);

        session.setStatus(SessionStatus.VOTING);
        session.setCurrentTaskId(dto.taskId());
        sessionRepository.save(session);

        return toRoundDto(round);
    }

    public RoundResponseDto revealRound(UUID sessionId, UUID userId) {
        var session = findSession(sessionId);
        assertFacilitator(session, userId);

        var round = roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)
                .orElseThrow(() -> new ConflictException("NO_ACTIVE_ROUND"));

        round.setStatus(RoundStatus.REVEALED);
        round.setRevealedAt(Instant.now());
        round = roundRepository.save(round);

        session.setStatus(SessionStatus.REVEALED);
        sessionRepository.save(session);

        return toRoundDto(round);
    }

    public RoundResponseDto acceptEstimate(UUID sessionId, UUID userId, Integer finalEstimate) {
        var session = findSession(sessionId);
        assertFacilitator(session, userId);

        var round = roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.REVEALED)
                .orElseThrow(() -> new ConflictException("NO_REVEALED_ROUND_ACCEPT"));

        round.setFinalEstimate(finalEstimate);
        round.setStatus(RoundStatus.CONSENSUS);
        round = roundRepository.save(round);

        if (finalEstimate != null) {
            taskServiceClient.updateStoryPoints(round.getTaskId(), finalEstimate);
        }

        session.setStatus(SessionStatus.LOBBY);
        session.setCurrentTaskId(null);
        sessionRepository.save(session);

        return toRoundDto(round);
    }

    public RoundResponseDto revote(UUID sessionId, UUID userId) {
        var session = findSession(sessionId);
        assertFacilitator(session, userId);

        var oldRound = roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.REVEALED)
                .orElseThrow(() -> new ConflictException("NO_REVEALED_ROUND_REVOTE"));

        oldRound.setStatus(RoundStatus.CONSENSUS);
        oldRound.setFinalEstimate(null);
        roundRepository.save(oldRound);

        var newRound = PokerRound.builder()
                .session(session)
                .taskId(oldRound.getTaskId())
                .taskTitle(oldRound.getTaskTitle())
                .build();
        newRound = roundRepository.save(newRound);

        session.setStatus(SessionStatus.VOTING);
        sessionRepository.save(session);

        return toRoundDto(newRound);
    }

    @Transactional(readOnly = true)
    public List<RoundResponseDto> getRounds(UUID sessionId) {
        return roundRepository.findBySessionIdOrderByStartedAtAsc(sessionId)
                .stream().map(this::toRoundDto).toList();
    }
    
    private PokerSession findSession(UUID sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("SESSION_NOT_FOUND"));
    }

    private void assertFacilitator(PokerSession session, UUID userId) {
        if (!session.getCreatedBy().equals(userId)) {
            throw new ForbiddenException("SESSION_FACILITATOR_REQUIRED");
        }
    }

    private SessionResponseDto toDto(PokerSession s) {
        var participants = s.getParticipants().stream().map(this::toParticipantDto).toList();
        return new SessionResponseDto(
                s.getId(), s.getProjectId(), s.getName(), s.getStatus(),
                s.getDeck(), s.getCreatedBy(), s.getCurrentTaskId(),
                participants, s.getCreatedAt(), s.getUpdatedAt()
        );
    }

    private ParticipantDto toParticipantDto(PokerParticipant p) {
        return new ParticipantDto(p.getId(), p.getUserId(), p.getDisplayName(),
                p.getRole(), p.isConnected(), p.getJoinedAt());
    }

    private RoundResponseDto toRoundDto(PokerRound r) {
        var votes = r.getVotes().stream()
                .map(v -> new VoteDto(v.getUserId(), v.getValue(), v.getVotedAt()))
                .toList();
        return new RoundResponseDto(r.getId(), r.getTaskId(), r.getTaskTitle(),
                r.getStatus(), r.getFinalEstimate(), votes,
                r.getStartedAt(), r.getRevealedAt());
    }
}