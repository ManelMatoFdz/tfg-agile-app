package com.tfg.agile.app.poker_service.repository;

import com.tfg.agile.app.poker_service.FlywayMigrationConfig;
import com.tfg.agile.app.poker_service.entity.ParticipantRole;
import com.tfg.agile.app.poker_service.entity.PokerParticipant;
import com.tfg.agile.app.poker_service.entity.PokerRound;
import com.tfg.agile.app.poker_service.entity.PokerSession;
import com.tfg.agile.app.poker_service.entity.PokerVote;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Duration;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Testcontainers
@ActiveProfiles("test")
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(FlywayMigrationConfig.class)
class PokerSessionRepositoryIT {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired
    private PokerSessionRepository sessionRepository;

    @Autowired
    private PokerParticipantRepository participantRepository;

    @Autowired
    private PokerRoundRepository roundRepository;

    @Autowired
    private PokerVoteRepository voteRepository;

    @Test
    void repositoryOrdersSessionsAndDeletesChildrenByCascade() throws InterruptedException {
        UUID projectId = UUID.randomUUID();
        UUID creatorId = UUID.randomUUID();

        PokerSession older = PokerSession.builder()
                .projectId(projectId)
                .name("Sprint 1")
                .createdBy(creatorId)
                .build();

        PokerRound round = PokerRound.builder()
                .session(older)
                .taskId(UUID.randomUUID())
                .taskTitle("Estimate login flow")
                .build();
        older.getRounds().add(round);

        PokerParticipant participant = PokerParticipant.builder()
                .session(older)
                .userId(UUID.randomUUID())
                .displayName("Ada")
                .role(ParticipantRole.VOTER)
                .build();
        older.getParticipants().add(participant);

        PokerVote vote = PokerVote.builder()
                .round(round)
                .userId(UUID.randomUUID())
                .value("8")
                .build();
        round.getVotes().add(vote);

        PokerSession persistedOlder = sessionRepository.saveAndFlush(older);

        Thread.sleep(Duration.ofMillis(20));

        PokerSession newer = sessionRepository.save(PokerSession.builder()
                .projectId(projectId)
                .name("Sprint 2")
                .createdBy(creatorId)
                .build());

        assertThat(sessionRepository.findByProjectIdOrderByCreatedAtDesc(projectId))
                .extracting(PokerSession::getId)
                .containsExactly(newer.getId(), persistedOlder.getId());

        sessionRepository.delete(persistedOlder);
        sessionRepository.flush();

        assertThat(participantRepository.count()).isZero();
        assertThat(roundRepository.count()).isZero();
        assertThat(voteRepository.count()).isZero();
    }
}
