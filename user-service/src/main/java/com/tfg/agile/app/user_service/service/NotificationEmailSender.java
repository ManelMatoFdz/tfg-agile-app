package com.tfg.agile.app.user_service.service;

public interface NotificationEmailSender {

    void sendNotification(String email, String title, String message, String link);
}
