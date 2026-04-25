package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.service.SprintService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class SprintController {

    private final SprintService sprintService;

    public SprintController(SprintService sprintService) {
        this.sprintService = sprintService;
    }

    // ── Backlog ───────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/backlog")
    public List<TaskResponseDto> getBacklog(@PathVariable UUID projectId,
                                            @AuthenticationPrincipal UUID callerId) {
        return sprintService.getBacklog(projectId, callerId);
    }

    // ── Sprints ───────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/sprints")
    public List<SprintResponseDto> listSprints(@PathVariable UUID projectId,
                                               @AuthenticationPrincipal UUID callerId) {
        return sprintService.listSprints(projectId, callerId);
    }

    @GetMapping("/sprints/{sprintId}")
    public SprintResponseDto getSprint(@PathVariable UUID sprintId,
                                       @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprint(sprintId, callerId);
    }

    @GetMapping("/sprints/{sprintId}/tasks")
    public List<TaskResponseDto> getSprintTasks(@PathVariable UUID sprintId,
                                                @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprintTasks(sprintId, callerId);
    }

    @PostMapping("/projects/{projectId}/sprints")
    public ResponseEntity<SprintResponseDto> createSprint(
            @PathVariable UUID projectId,
            @Valid @RequestBody CreateSprintRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sprintService.createSprint(projectId, dto, callerId));
    }

    @PutMapping("/sprints/{sprintId}")
    public SprintResponseDto updateSprint(@PathVariable UUID sprintId,
                                          @Valid @RequestBody UpdateSprintRequestDto dto,
                                          @AuthenticationPrincipal UUID callerId) {
        return sprintService.updateSprint(sprintId, dto, callerId);
    }

    @PostMapping("/sprints/{sprintId}/activate")
    public SprintResponseDto activateSprint(@PathVariable UUID sprintId,
                                            @AuthenticationPrincipal UUID callerId) {
        return sprintService.activateSprint(sprintId, callerId);
    }

    @PostMapping("/sprints/{sprintId}/complete")
    public SprintResponseDto completeSprint(@PathVariable UUID sprintId,
                                            @AuthenticationPrincipal UUID callerId) {
        return sprintService.completeSprint(sprintId, callerId);
    }

    @PostMapping("/sprints/{sprintId}/tasks")
    public List<TaskResponseDto> assignTasksToSprint(
            @PathVariable UUID sprintId,
            @RequestBody AssignTaskToSprintRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return sprintService.assignTasksToSprint(sprintId, dto, callerId);
    }

    @DeleteMapping("/sprints/{sprintId}/tasks/{taskId}")
    public TaskResponseDto removeTaskFromSprint(@PathVariable UUID sprintId,
                                                @PathVariable UUID taskId,
                                                @AuthenticationPrincipal UUID callerId) {
        return sprintService.removeTaskFromSprint(sprintId, taskId, callerId);
    }
}