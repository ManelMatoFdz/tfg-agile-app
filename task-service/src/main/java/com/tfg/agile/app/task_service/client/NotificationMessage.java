package com.tfg.agile.app.task_service.client;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serial;
import java.io.Serializable;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    private UUID userId;
    private String title;
    private String message;
    private String type;
    private String link;
    private String data;
    private UUID actorUserId;
}
