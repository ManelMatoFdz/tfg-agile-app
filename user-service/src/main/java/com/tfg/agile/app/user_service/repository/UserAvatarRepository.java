package com.tfg.agile.app.user_service.repository;

import com.tfg.agile.app.user_service.entity.UserAvatar;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserAvatarRepository extends JpaRepository<UserAvatar, UUID> {

    Optional<UserAvatar> findByUserId(UUID userId);
}
