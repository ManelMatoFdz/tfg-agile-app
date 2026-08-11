package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.service.GitWebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Endpoint publico llamado por GitHub. No lleva JWT: la autenticidad se comprueba
 * con la firma HMAC SHA-256 del cuerpo (cabecera X-Hub-Signature-256).
 */
@RestController
public class GitWebhookController {

    private final GitWebhookService gitWebhookService;

    public GitWebhookController(GitWebhookService gitWebhookService) {
        this.gitWebhookService = gitWebhookService;
    }

    @PostMapping("/webhooks/github/{projectId}")
    public ResponseEntity<Map<String, Integer>> receive(
            @PathVariable("projectId") UUID projectId,
            @RequestHeader(value = "X-GitHub-Event", required = false) String eventName,
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestBody byte[] payload) {
        int stored = gitWebhookService.handleGitHubWebhook(projectId, eventName, signature, payload);
        return ResponseEntity.ok(Map.of("eventsStored", stored));
    }
}
