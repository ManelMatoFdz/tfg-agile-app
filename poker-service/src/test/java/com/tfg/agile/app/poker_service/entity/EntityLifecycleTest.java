package com.tfg.agile.app.poker_service.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class EntityLifecycleTest {

    @Test
    void session_prePersist_setsTimestamps() {
        PokerSession session = PokerSession.builder()
                .projectId(UUID.randomUUID())
                .name("Session")
                .createdBy(UUID.randomUUID())
                .build();

        session.prePersist();

        assertThat(session.getCreatedAt()).isNotNull();
        assertThat(session.getUpdatedAt()).isEqualTo(session.getCreatedAt());
    }

    @Test
    void session_preUpdate_refreshesUpdatedAt() {
        PokerSession session = PokerSession.builder()
                .projectId(UUID.randomUUID())
                .name("Session")
                .createdBy(UUID.randomUUID())
                .build();
        Instant oldUpdatedAt = Instant.now().minusSeconds(60);
        session.setUpdatedAt(oldUpdatedAt);

        session.preUpdate();

        assertThat(session.getUpdatedAt()).isAfter(oldUpdatedAt);
    }

    @Test
    void round_prePersist_setsStartedAt() {
        PokerRound round = PokerRound.builder()
                .session(PokerSession.builder().projectId(UUID.randomUUID()).name("S").createdBy(UUID.randomUUID()).build())
                .taskId(UUID.randomUUID())
                .taskTitle("Task")
                .build();

        round.prePersist();

        assertThat(round.getStartedAt()).isNotNull();
    }

    @Test
    void participant_prePersist_setsJoinedAt() {
        PokerParticipant participant = PokerParticipant.builder()
                .session(PokerSession.builder().projectId(UUID.randomUUID()).name("S").createdBy(UUID.randomUUID()).build())
                .userId(UUID.randomUUID())
                .displayName("User")
                .build();

        participant.prePersist();

        assertThat(participant.getJoinedAt()).isNotNull();
    }

    @Test
    void vote_prePersist_setsVotedAt() {
        PokerVote vote = PokerVote.builder()
                .round(PokerRound.builder()
                        .session(PokerSession.builder().projectId(UUID.randomUUID()).name("S").createdBy(UUID.randomUUID()).build())
                        .taskId(UUID.randomUUID())
                        .taskTitle("Task")
                        .build())
                .userId(UUID.randomUUID())
                .value("5")
                .build();

        vote.prePersist();

        assertThat(vote.getVotedAt()).isNotNull();
    }
}

