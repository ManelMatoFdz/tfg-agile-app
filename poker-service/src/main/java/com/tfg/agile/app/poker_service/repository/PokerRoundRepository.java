package com.tfg.agile.app.poker_service.repository;

import com.tfg.agile.app.poker_service.entity.PokerRound;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PokerRoundRepository extends JpaRepository<PokerRound, UUID> {

    List<PokerRound> findBySessionIdOrderByStartedAtAsc(UUID sessionId);

    Optional<PokerRound> findBySessionIdAndStatus(UUID sessionId, RoundStatus status);

    Optional<PokerRound> findTopBySessionIdOrderByStartedAtDesc(UUID sessionId);

    Optional<PokerRound> findBySessionIdAndTaskIdAndStatus(UUID sessionId, UUID taskId, RoundStatus status);
}
