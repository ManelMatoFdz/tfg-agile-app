package com.tfg.agile.app.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponseDto {

    private UUID id;
    private String title;
    private String message;
    private String type;
    private boolean isRead;
    private Instant createdAt;
    private String link;
}
