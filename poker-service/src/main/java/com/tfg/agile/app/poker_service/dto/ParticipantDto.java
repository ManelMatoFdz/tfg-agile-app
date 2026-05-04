package com.tfg.agile.app.poker_service.dto;

import com.tfg.agile.app.poker_service.entity.ParticipantRole;

import java.time.Instant;
import java.util.UUID;

public record ParticipantDto(
        UUID id,
        UUID userId,
        String displayName,
        ParticipantRole role,
        boolean connected,
        Instant joinedAt
) {}