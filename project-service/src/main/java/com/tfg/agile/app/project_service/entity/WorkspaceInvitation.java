package com.tfg.agile.app.project_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(
    name = "workspace_invitations",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_workspace_invitations_workspace_email_pending",
        columnNames = {"workspace_id", "invited_email", "status"}
    )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkspaceInvitation {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false, updatable = false)
    private Workspace workspace;

    @Column(name = "invited_email", nullable = false, updatable = false, length = 255)
    private String invitedEmail;

    @Column(nullable = false, updatable = false)
    private UUID invitedUserId;

    @Column(nullable = false, updatable = false)
    private UUID invitedByUserId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvitationStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }
}