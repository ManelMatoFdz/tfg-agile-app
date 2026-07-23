package com.tfg.agile.app.poker_service.dto;

import com.tfg.agile.app.poker_service.entity.DeckType;
import jakarta.validation.constraints.NotBlank;

public record CreateSessionRequestDto(
        @NotBlank String name,
        DeckType deck,
        Integer timerSeconds
) {
    public CreateSessionRequestDto {
        if (deck == null) deck = DeckType.FIBONACCI;
    }
}