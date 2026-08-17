package com.tfg.agile.app.task_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_dependencies",
        uniqueConstraints = @UniqueConstraint(columnNames = {"blocking_task_id", "blocked_task_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskDependency {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "blocking_task_id", nullable = false)
    private UUID blockingTaskId;

    @Column(name = "blocked_task_id", nullable = false)
    private UUID blockedTaskId;

    @Column(nullable = false, updatable = false)
    private UUID createdBy;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}
