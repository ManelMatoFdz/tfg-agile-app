package com.tfg.agile.app.user_service.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateNotificationSettingsRequestDto {

    private Boolean emailNotificationsEnabled;
    private Boolean inAppNotificationsEnabled;
    private Boolean projectUpdatesEnabled;
    private Boolean taskRemindersEnabled;
}
