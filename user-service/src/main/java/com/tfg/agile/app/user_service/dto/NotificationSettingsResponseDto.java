package com.tfg.agile.app.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationSettingsResponseDto {

    private boolean emailNotificationsEnabled;
    private boolean inAppNotificationsEnabled;
    private boolean projectUpdatesEnabled;
    private boolean taskRemindersEnabled;
}
