package com.tfg.agile.app.poker_service.repository;

import com.tfg.agile.app.poker_service.entity.PokerSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface PokerSessionRepository extends JpaRepository<PokerSession, UUID> {

    List<PokerSession> findByProjectIdOrderByCreatedAtDesc(UUID projectId);
}