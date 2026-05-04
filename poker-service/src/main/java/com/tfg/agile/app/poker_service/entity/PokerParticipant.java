package com.tfg.agile.app.poker_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "poker_participants",
       uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PokerParticipant {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private PokerSession session;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private ParticipantRole role = ParticipantRole.VOTER;

    @Column(nullable = false)
    @Builder.Default
    private boolean connected = true;

    @Column(nullable = false, updatable = false)
    private Instant joinedAt;

    @PrePersist
    void prePersist() {
        joinedAt = Instant.now();
    }
}