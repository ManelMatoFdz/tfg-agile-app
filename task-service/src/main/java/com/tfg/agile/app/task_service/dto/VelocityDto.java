package com.tfg.agile.app.task_service.dto;

public record VelocityDto(
        double averageVelocity,
        long completedSprints
) {}