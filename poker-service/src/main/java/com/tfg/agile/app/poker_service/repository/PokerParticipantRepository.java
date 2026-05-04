package com.tfg.agile.app.poker_service.repository;

import com.tfg.agile.app.poker_service.entity.PokerParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PokerParticipantRepository extends JpaRepository<PokerParticipant, UUID> {

    Optional<PokerParticipant> findBySessionIdAndUserId(UUID sessionId, UUID userId);

    boolean existsBySessionIdAndUserId(UUID sessionId, UUID userId);
}