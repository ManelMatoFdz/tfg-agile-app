package com.tfg.agile.app.task_service.dto;

import com.tfg.agile.app.task_service.entity.BoardColumn;
import jakarta.validation.constraints.NotBlank;

import java.util.UUID;

public record BoardColumnDto(
        UUID id,
        @NotBlank String name,
        int position,
        String color,
        Integer wipLimit,
        boolean doneEquivalent
) {
    public static BoardColumnDto from(BoardColumn col) {
        return new BoardColumnDto(
                col.getId(), col.getName(), col.getPosition(),
                col.getColor(), col.getWipLimit(), col.isDoneEquivalent()
        );
    }
}