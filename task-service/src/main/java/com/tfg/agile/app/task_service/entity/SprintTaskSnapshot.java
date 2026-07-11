package com.tfg.agile.app.task_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "sprint_task_snapshots")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SprintTaskSnapshot {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false)
    private UUID sprintId;

    @Column
    private UUID taskId;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String statusAtEnd;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TaskPriority priority;

    @Column
    private LocalDate dueDate;

    @Column
    private Instant completedAt;

    @Column
    private Integer storyPoints;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private TaskType type;

    @Column
    private UUID parentTaskId;

    @Column(nullable = false)
    private boolean completed;

    @Column(nullable = false)
    private boolean returnedToBacklog;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void prePersist() {
        createdAt = Instant.now();
    }
}