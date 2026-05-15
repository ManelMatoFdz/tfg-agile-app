package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.dto.*;
import com.tfg.agile.app.poker_service.service.PokerSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class PokerSessionController {

    private final PokerSessionService service;

    public PokerSessionController(PokerSessionService service) {
        this.service = service;
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
        return ResponseEntity.ok(service.joinSession(sessionId, userId, dto));
    }

    @PostMapping("/poker/sessions/{sessionId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leaveSession(@PathVariable("sessionId") UUID sessionId,
                             @AuthenticationPrincipal UUID userId) {
        service.leaveSession(sessionId, userId);
    }

    @PostMapping("/poker/sessions/{sessionId}/close")
    public SessionResponseDto closeSession(@PathVariable("sessionId") UUID sessionId,
                                           @AuthenticationPrincipal UUID userId) {
        return service.closeSession(sessionId, userId);
    }

    @PostMapping("/poker/sessions/{sessionId}/rounds")
    public ResponseEntity<RoundResponseDto> startRound(
            @PathVariable("sessionId") UUID sessionId,
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody StartRoundRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.startRound(sessionId, userId, dto));
    }

    @GetMapping("/poker/sessions/{sessionId}/rounds")
    public List<RoundResponseDto> getRounds(@PathVariable("sessionId") UUID sessionId) {
        return service.getRounds(sessionId);
    }
}