package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.dto.RoundResponseDto;
import com.tfg.agile.app.poker_service.entity.ParticipantRole;
import com.tfg.agile.app.poker_service.entity.PokerVote;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import com.tfg.agile.app.poker_service.exception.ForbiddenException;
import com.tfg.agile.app.poker_service.repository.PokerParticipantRepository;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.repository.PokerVoteRepository;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Controller
public class PokerWebSocketController {

    private final PokerSessionService sessionService;
    private final PokerRoundRepository roundRepository;
    private final PokerVoteRepository voteRepository;
    private final PokerParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PokerWebSocketController(PokerSessionService sessionService,
                                    PokerRoundRepository roundRepository,
                                    PokerVoteRepository voteRepository,
                                    PokerParticipantRepository participantRepository,
                                    SimpMessagingTemplate messagingTemplate) {
        this.sessionService = sessionService;
        this.roundRepository = roundRepository;
        this.voteRepository = voteRepository;
        this.participantRepository = participantRepository;
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/poker/{sessionId}/vote")
    @Transactional
    public void vote(@DestinationVariable UUID sessionId,
                     @Payload Map<String, String> payload,
                     SimpMessageHeaderAccessor headerAccessor) {
        UUID userId = extractUserId(headerAccessor);
        String value = payload.get("value");

        var participant = participantRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new ForbiddenException("NOT_SESSION_PARTICIPANT"));
        if (participant.getRole() != ParticipantRole.VOTER) {
            sendError(userId, "Observers cannot vote");
            return;
        }

        var round = roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING)
                .orElse(null);
        if (round == null) {
            sendError(userId, "No active voting round");
            return;
        }

        var existingVote = voteRepository.findByRoundIdAndUserId(round.getId(), userId);
        if (existingVote.isPresent()) {
            existingVote.get().setValue(value);
            voteRepository.save(existingVote.get());
        } else {
            var vote = PokerVote.builder()
                    .round(round)
                    .userId(userId)
                    .value(value)
                    .build();
            voteRepository.save(vote);
        }

        broadcastVoteStatus(sessionId, round.getId());

        long voterCount = participantRepository.findBySessionIdAndUserId(sessionId, userId)
                .map(p -> p.getSession().getParticipants().stream()
                        .filter(pp -> pp.getRole() == ParticipantRole.VOTER)
                        .count())
                .orElse(0L);
        long voteCount = voteRepository.countByRoundId(round.getId());
        if (voteCount >= voterCount && voterCount > 0) {
            var revealed = sessionService.revealRound(sessionId,
                    round.getSession().getCreatedBy());
            broadcastReveal(sessionId, revealed);
        }
    }

    @MessageMapping("/poker/{sessionId}/reveal")
    @Transactional
    public void reveal(@DestinationVariable UUID sessionId,
                       SimpMessageHeaderAccessor headerAccessor) {
        UUID userId = extractUserId(headerAccessor);
        var revealed = sessionService.revealRound(sessionId, userId);
        broadcastReveal(sessionId, revealed);
    }

    @MessageMapping("/poker/{sessionId}/next")
    @Transactional
    public void acceptAndNext(@DestinationVariable UUID sessionId,
                              @Payload Map<String, Object> payload,
                              SimpMessageHeaderAccessor headerAccessor) {
        UUID userId = extractUserId(headerAccessor);
        Integer finalEstimate = payload.get("finalEstimate") != null
                ? Integer.valueOf(payload.get("finalEstimate").toString()) : null;

        sessionService.acceptEstimate(sessionId, userId, finalEstimate);

        broadcastState(sessionId);
    }

    @MessageMapping("/poker/{sessionId}/revote")
    @Transactional
    public void revote(@DestinationVariable UUID sessionId,
                       SimpMessageHeaderAccessor headerAccessor) {
        UUID userId = extractUserId(headerAccessor);
        sessionService.revote(sessionId, userId);

        broadcastState(sessionId);
    }
    
    private void broadcastVoteStatus(UUID sessionId, UUID roundId) {
        var round = roundRepository.findById(roundId).orElse(null);
        if (round == null) return;

        Map<String, Boolean> voteStatus = new HashMap<>();
        round.getVotes().forEach(v -> voteStatus.put(v.getUserId().toString(), true));

        messagingTemplate.convertAndSend(
                "/topic/poker/" + sessionId + "/votes", voteStatus);
    }

    private void broadcastReveal(UUID sessionId, RoundResponseDto revealed) {
        messagingTemplate.convertAndSend(
                "/topic/poker/" + sessionId + "/reveal", revealed);
    }

    private void broadcastState(UUID sessionId) {
        var session = sessionService.getSession(sessionId);
        messagingTemplate.convertAndSend(
                "/topic/poker/" + sessionId + "/state", session);
    }

    private void sendError(UUID userId, String message) {
        messagingTemplate.convertAndSendToUser(
                userId.toString(), "/queue/poker/errors", Map.of("message", message));
    }

    private UUID extractUserId(SimpMessageHeaderAccessor headerAccessor) {
        if (headerAccessor.getUser() == null) {
            throw new ForbiddenException("NOT_AUTHENTICATED");
        }
        return UUID.fromString(headerAccessor.getUser().getName());
    }
}