package com.tfg.agile.app.task_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "git_events",
        uniqueConstraints = @UniqueConstraint(columnNames = {"project_id", "type", "external_id"}),
        indexes = {
                @Index(name = "idx_git_events_task", columnList = "task_id"),
                @Index(name = "idx_git_events_project", columnList = "project_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GitEvent {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "task_id")
    private UUID taskId;

    @Column(name = "project_id", nullable = false, updatable = false)
    private UUID projectId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private GitEventType type;

    /** SHA del commit, numero del PR o nombre de la branch. */
    @Column(name = "external_id", nullable = false)
    private String externalId;

    @Column(nullable = false)
    private String externalUrl;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(nullable = false)
    private String author;

    /** Solo para PRs: open / merged / closed. */
    @Column(length = 20)
    private String status;

    @Column(nullable = false)
    private Instant receivedAt;

    @PrePersist
    void prePersist() {
        if (receivedAt == null) {
            receivedAt = Instant.now();
        }
    }
}
