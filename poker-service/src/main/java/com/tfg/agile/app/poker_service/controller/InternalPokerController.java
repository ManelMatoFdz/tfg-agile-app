package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/internal")
@Slf4j
public class InternalPokerController {

    private final PokerSessionRepository pokerSessionRepository;

    public InternalPokerController(PokerSessionRepository pokerSessionRepository) {
        this.pokerSessionRepository = pokerSessionRepository;
    }

    @DeleteMapping("/projects/{projectId}/data")
    @Transactional
    public ResponseEntity<Void> deleteProjectData(@PathVariable("projectId") UUID projectId) {
        log.info("Deleting all poker sessions for project {}", projectId);
        pokerSessionRepository.deleteByProjectId(projectId);
        return ResponseEntity.noContent().build();
    }
}