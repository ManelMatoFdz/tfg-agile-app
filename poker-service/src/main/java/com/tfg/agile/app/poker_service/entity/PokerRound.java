package com.tfg.agile.app.poker_service.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "poker_rounds")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PokerRound {

    @Id
    @UuidGenerator
    @Column(updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private PokerSession session;

    @Column(nullable = false)
    private UUID taskId;

    @Column(nullable = false)
    private String taskTitle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoundStatus status = RoundStatus.VOTING;

    @Column
    private Integer finalEstimate;

    @OneToMany(mappedBy = "round", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<PokerVote> votes = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant startedAt;

    @Column
    private Instant revealedAt;

    @PrePersist
    void prePersist() {
        startedAt = Instant.now();
    }
}