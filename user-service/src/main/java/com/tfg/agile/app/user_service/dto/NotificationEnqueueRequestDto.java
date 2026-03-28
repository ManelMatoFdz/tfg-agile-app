package com.tfg.agile.app.user_service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEnqueueRequestDto {

    @NotNull
    private UUID userId;

    @NotBlank
    @Size(max = 200)
    private String title;

    @NotBlank
    @Size(max = 2000)
    private String message;

    @NotBlank
    @Size(max = 100)
    private String type;

    @Size(max = 500)
    private String link;
}
