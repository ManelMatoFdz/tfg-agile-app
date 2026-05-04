package com.tfg.agile.app.poker_service.dto;

import com.tfg.agile.app.poker_service.entity.ParticipantRole;
import jakarta.validation.constraints.NotBlank;

public record JoinSessionRequestDto(
        @NotBlank String displayName,
        ParticipantRole role
) {
    public JoinSessionRequestDto {
        if (role == null) role = ParticipantRole.VOTER;
    }
}