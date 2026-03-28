package com.tfg.agile.app.user_service.repository;

import com.tfg.agile.app.user_service.entity.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(String tokenHash, Instant now);

    boolean existsByUserIdAndUsedAtIsNullAndExpiresAtAfter(UUID userId, Instant now);

    List<PasswordResetToken> findAllByUserIdAndUsedAtIsNullAndExpiresAtAfter(UUID userId, Instant now);
}
