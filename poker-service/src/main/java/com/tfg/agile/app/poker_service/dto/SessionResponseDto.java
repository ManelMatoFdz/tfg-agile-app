package com.tfg.agile.app.poker_service.dto;

import com.tfg.agile.app.poker_service.entity.DeckType;
import com.tfg.agile.app.poker_service.entity.SessionStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SessionResponseDto(
        UUID id,
        UUID projectId,
        String name,
        SessionStatus status,
        DeckType deck,
        UUID createdBy,
        UUID currentTaskId,
        List<ParticipantDto> participants,
        Instant createdAt,
        Instant updatedAt
) {}