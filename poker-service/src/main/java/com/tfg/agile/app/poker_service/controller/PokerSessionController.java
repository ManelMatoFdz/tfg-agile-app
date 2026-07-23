package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.dto.*;
import com.tfg.agile.app.poker_service.entity.RoundStatus;
import com.tfg.agile.app.poker_service.entity.SessionStatus;
import com.tfg.agile.app.poker_service.repository.PokerRoundRepository;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class PokerSessionController {

    private final PokerSessionService service;
    private final PokerRoundRepository roundRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public PokerSessionController(PokerSessionService service,
                                   PokerRoundRepository roundRepository,
                                   SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.roundRepository = roundRepository;
        this.messagingTemplate = messagingTemplate;
    }

    private void broadcastParticipants(UUID sessionId) {
        var participants = service.getSession(sessionId).participants();
        messagingTemplate.convertAndSend("/topic/poker/" + sessionId + "/participants", participants);
    }

    private void broadcastVoteStatusIfVoting(UUID sessionId) {
        var session = service.getSession(sessionId);
        if (session.status() != SessionStatus.VOTING) return;
        roundRepository.findBySessionIdAndStatus(sessionId, RoundStatus.VOTING).ifPresent(round -> {
            Map<String, Boolean> voteStatus = new HashMap<>();
            round.getVotes().forEach(v -> voteStatus.put(v.getUserId().toString(), true));
            messagingTemplate.convertAndSend("/topic/poker/" + sessionId + "/votes", voteStatus);
        });
    }

    private void broadcastState(UUID sessionId) {
        var session = service.getSession(sessionId);
        messagingTemplate.convertAndSend("/topic/poker/" + sessionId + "/state", session);
    }

    @PostMapping("/projects/{projectId}/poker/sessions")
    public ResponseEntity<SessionResponseDto> createSession(
            @PathVariable("projectId") UUID projectId,
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody CreateSessionRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createSession(projectId, userId, dto));
    }

    @GetMapping("/projects/{projectId}/poker/sessions")
    public List<SessionResponseDto> listSessions(@PathVariable("projectId") UUID projectId) {
        return service.listSessions(projectId);
    }

    @GetMapping("/poker/sessions/{sessionId}")
    public SessionResponseDto getSession(@PathVariable("sessionId") UUID sessionId) {
        return service.getSession(sessionId);
    }

    @PostMapping("/poker/sessions/{sessionId}/join")
    public ResponseEntity<ParticipantDto> joinSession(
            @PathVariable("sessionId") UUID sessionId,
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody JoinSessionRequestDto dto) {
        var result = service.joinSession(sessionId, userId, dto);
        broadcastParticipants(sessionId);
        broadcastVoteStatusIfVoting(sessionId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/poker/sessions/{sessionId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveSession(@PathVariable("sessionId") UUID sessionId,
                             @AuthenticationPrincipal UUID userId) {
        service.leaveSession(sessionId, userId);
        broadcastParticipants(sessionId);
    }

    @PostMapping("/poker/sessions/{sessionId}/close")
    public SessionResponseDto closeSession(@PathVariable("sessionId") UUID sessionId,
                                           @AuthenticationPrincipal UUID userId) {
        var result = service.closeSession(sessionId, userId);
        broadcastState(sessionId);
        return result;
    }

    @PostMapping("/poker/sessions/{sessionId}/timer")
    public SessionResponseDto updateTimer(
            @PathVariable("sessionId") UUID sessionId,
            @AuthenticationPrincipal UUID userId,
            @RequestBody UpdateTimerRequestDto dto) {
        var result = service.updateTimer(sessionId, userId, dto);
        broadcastState(sessionId);
        return result;
    }

    @PostMapping("/poker/sessions/{sessionId}/select-task")
    public SessionResponseDto selectTask(
            @PathVariable("sessionId") UUID sessionId,
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody SelectTaskRequestDto dto) {
        var result = service.selectTask(sessionId, userId, dto);
        broadcastState(sessionId);
        return result;
    }

    @PostMapping("/poker/sessions/{sessionId}/rounds")
    public ResponseEntity<RoundResponseDto> startRound(
            @PathVariable("sessionId") UUID sessionId,
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody StartRoundRequestDto dto) {
        var result = service.startRound(sessionId, userId, dto);
        broadcastState(sessionId);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @GetMapping("/poker/sessions/{sessionId}/rounds")
    public List<RoundResponseDto> getRounds(@PathVariable("sessionId") UUID sessionId) {
        return service.getRounds(sessionId);
    }
}