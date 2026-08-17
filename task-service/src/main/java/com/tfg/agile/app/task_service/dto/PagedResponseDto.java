package com.tfg.agile.app.task_service.dto;

import java.util.List;

public record PagedResponseDto<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext
) {
}