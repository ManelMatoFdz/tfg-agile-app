package com.tfg.agile.app.poker_service.dto;

import com.tfg.agile.app.poker_service.entity.RoundStatus;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record RoundResponseDto(
        UUID id,
        UUID taskId,
        String taskTitle,
        RoundStatus status,
        Integer finalEstimate,
        List<VoteDto> votes,
        Instant startedAt,
        Instant revealedAt,
        Instant timerEndsAt
) {}