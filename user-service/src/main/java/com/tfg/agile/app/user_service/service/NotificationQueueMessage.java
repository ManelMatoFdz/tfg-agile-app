package com.tfg.agile.app.user_service.service;

import com.tfg.agile.app.user_service.dto.NotificationEnqueueRequestDto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationQueueMessage implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private UUID userId;
    private String title;
    private String message;
    private String type;
    private String link;

    public static NotificationQueueMessage fromRequest(NotificationEnqueueRequestDto req) {
        return new NotificationQueueMessage(
                req.getUserId(),
                req.getTitle(),
                req.getMessage(),
                req.getType(),
                req.getLink()
        );
    }
}
