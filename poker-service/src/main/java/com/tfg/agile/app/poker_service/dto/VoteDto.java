package com.tfg.agile.app.poker_service.dto;

import java.time.Instant;
import java.util.UUID;

public record VoteDto(
        UUID userId,
        String value,
        Instant votedAt
) {}