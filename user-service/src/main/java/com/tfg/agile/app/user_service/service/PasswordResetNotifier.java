package com.tfg.agile.app.user_service.service;

public interface PasswordResetNotifier {

    void sendPasswordReset(String email, String resetLink);
}
