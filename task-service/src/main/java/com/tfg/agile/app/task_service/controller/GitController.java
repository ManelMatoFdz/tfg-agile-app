package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.GitEventDto;
import com.tfg.agile.app.task_service.dto.GitIntegrationDto;
import com.tfg.agile.app.task_service.dto.LinkGitEventRequestDto;
import com.tfg.agile.app.task_service.dto.SetupGitIntegrationRequestDto;
import com.tfg.agile.app.task_service.service.GitIntegrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class GitController {

    private final GitIntegrationService gitIntegrationService;

    public GitController(GitIntegrationService gitIntegrationService) {
        this.gitIntegrationService = gitIntegrationService;
    }

    @PostMapping("/projects/{projectId}/git/setup")
    public GitIntegrationDto setup(@PathVariable("projectId") UUID projectId,
                                   @Valid @RequestBody SetupGitIntegrationRequestDto dto,
                                   @AuthenticationPrincipal UUID callerId) {
        return gitIntegrationService.setup(projectId, dto, callerId);
    }

    @GetMapping("/projects/{projectId}/git/config")
    public ResponseEntity<GitIntegrationDto> getConfig(@PathVariable("projectId") UUID projectId,
                                                       @AuthenticationPrincipal UUID callerId) {
        GitIntegrationDto config = gitIntegrationService.getConfig(projectId, callerId);
        return config != null ? ResponseEntity.ok(config) : ResponseEntity.noContent().build();
    }

    @DeleteMapping("/projects/{projectId}/git/config")
    public ResponseEntity<Void> disconnect(@PathVariable("projectId") UUID projectId,
                                           @AuthenticationPrincipal UUID callerId) {
        gitIntegrationService.disconnect(projectId, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectId}/git/events")
    public List<GitEventDto> projectActivity(@PathVariable("projectId") UUID projectId,
                                             @AuthenticationPrincipal UUID callerId) {
        return gitIntegrationService.findByProject(projectId, callerId);
    }

    @GetMapping("/tasks/{taskId}/git-events")
    public List<GitEventDto> taskActivity(@PathVariable("taskId") UUID taskId,
                                          @AuthenticationPrincipal UUID callerId) {
        return gitIntegrationService.findByTask(taskId, callerId);
    }

    @PostMapping("/tasks/{taskId}/git-events")
    public ResponseEntity<GitEventDto> link(@PathVariable("taskId") UUID taskId,
                                            @Valid @RequestBody LinkGitEventRequestDto dto,
                                            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(gitIntegrationService.linkManually(taskId, dto, callerId));
    }

    @DeleteMapping("/tasks/{taskId}/git-events/{eventId}")
    public ResponseEntity<Void> unlink(@PathVariable("taskId") UUID taskId,
                                       @PathVariable("eventId") UUID eventId,
                                       @AuthenticationPrincipal UUID callerId) {
        gitIntegrationService.unlink(taskId, eventId, callerId);
        return ResponseEntity.noContent().build();
    }
}
