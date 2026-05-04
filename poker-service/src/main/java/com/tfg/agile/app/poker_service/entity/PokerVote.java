package com.tfg.agile.app.poker_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "poker_votes",
       uniqueConstraints = @UniqueConstraint(columnNames = {"round_id", "user_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PokerVote {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "round_id", nullable = false)
    private PokerRound round;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 10)
    private String value;

    @Column(nullable = false, updatable = false)
    private Instant votedAt;

    @PrePersist
    void prePersist() {
        votedAt = Instant.now();
    }
}