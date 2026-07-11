package com.tfg.agile.app.task_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TaskActivity {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private UUID taskId;

    @Column
    private UUID actorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TaskActivityType type;

    @Column(length = 500)
    private String oldValue;

    @Column(length = 500)
    private String newValue;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}