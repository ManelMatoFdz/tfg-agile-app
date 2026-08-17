package com.tfg.agile.app.task_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "git_integrations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GitIntegration {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, updatable = false, unique = true)
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private GitProvider provider = GitProvider.GITHUB;

    @Column(nullable = false)
    private String repositoryUrl;

    /**
     * Secreto compartido con GitHub. No se puede hashear: se necesita en claro
     * para recalcular el HMAC SHA-256 de cada webhook recibido. Nunca se expone
     * en las respuestas de lectura, solo en la respuesta del setup.
     */
    @Column(nullable = false)
    private String webhookSecret;

    @Column(nullable = false, updatable = false)
    private UUID createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
