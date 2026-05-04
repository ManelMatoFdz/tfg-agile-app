package com.tfg.agile.app.poker_service.repository;

import com.tfg.agile.app.poker_service.entity.PokerVote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PokerVoteRepository extends JpaRepository<PokerVote, UUID> {

    Optional<PokerVote> findByRoundIdAndUserId(UUID roundId, UUID userId);

    long countByRoundId(UUID roundId);
}
