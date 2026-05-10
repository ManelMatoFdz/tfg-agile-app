package com.tfg.agile.app.poker_service.support;

import com.tfg.agile.app.poker_service.dto.ParticipantDto;
import com.tfg.agile.app.poker_service.dto.RoundResponseDto;
import com.tfg.agile.app.poker_service.dto.SessionResponseDto;
import com.tfg.agile.app.poker_service.dto.VoteDto;
import com.tfg.agile.app.poker_service.entity.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class TestDataFactory {

    private TestDataFactory() {
    }

    public static PokerSession session(UUID projectId, UUID createdBy) {
        Instant now = Instant.now();
        return PokerSession.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("Session")
                .deck(DeckType.FIBONACCI)
                .status(SessionStatus.LOBBY)
                .createdBy(createdBy)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    public static PokerRound round(PokerSession session, UUID taskId) {
        Instant now = Instant.now();
        return PokerRound.builder()
                .id(UUID.randomUUID())
                .session(session)
                .taskId(taskId)
                .taskTitle("Task")
                .status(RoundStatus.VOTING)
                .startedAt(now)
                .build();
    }

    public static PokerParticipant participant(PokerSession session, UUID userId, ParticipantRole role) {
        Instant now = Instant.now();
        return PokerParticipant.builder()
                .id(UUID.randomUUID())
                .session(session)
                .userId(userId)
                .displayName("User")
                .role(role)
                .connected(true)
                .joinedAt(now)
                .build();
    }

    public static PokerVote vote(PokerRound round, UUID userId, String value) {
        Instant now = Instant.now();
        return PokerVote.builder()
                .id(UUID.randomUUID())
                .round(round)
                .userId(userId)
                .value(value)
                .votedAt(now)
                .build();
    }

    public static SessionResponseDto sessionResponse(PokerSession session) {
        List<ParticipantDto> participants = session.getParticipants().stream()
                .map(p -> new ParticipantDto(p.getId(), p.getUserId(), p.getDisplayName(),
                        p.getRole(), p.isConnected(), p.getJoinedAt()))
                .toList();
        return new SessionResponseDto(
                session.getId(), session.getProjectId(), session.getName(), session.getStatus(),
                session.getDeck(), session.getCreatedBy(), session.getCurrentTaskId(),
                participants, session.getCreatedAt(), session.getUpdatedAt()
        );
    }

    public static RoundResponseDto roundResponse(PokerRound round) {
        List<VoteDto> votes = round.getVotes().stream()
                .map(v -> new VoteDto(v.getUserId(), v.getValue(), v.getVotedAt()))
                .toList();
        return new RoundResponseDto(
                round.getId(), round.getTaskId(), round.getTaskTitle(), round.getStatus(),
                round.getFinalEstimate(), votes, round.getStartedAt(), round.getRevealedAt()
        );
    }
}

