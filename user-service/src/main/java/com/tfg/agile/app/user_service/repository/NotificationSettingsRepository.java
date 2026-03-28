package com.tfg.agile.app.user_service.repository;

import com.tfg.agile.app.user_service.entity.NotificationSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NotificationSettingsRepository extends JpaRepository<NotificationSettings, UUID> {

    Optional<NotificationSettings> findByUserId(UUID userId);
}
