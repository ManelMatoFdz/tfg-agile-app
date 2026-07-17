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
    public List<TaskResponseDto> getBacklog(@PathVariable("projectId") UUID projectId,
                                            @RequestParam(required = false) List<String> priority,
                                            @RequestParam(required = false) List<UUID> assigneeId,
                                            @RequestParam(required = false) List<UUID> labelId,
                                            @RequestParam(required = false) List<String> status,
                                            @RequestParam(required = false) String search,
                                            @AuthenticationPrincipal UUID callerId) {
        return sprintService.getBacklog(projectId, priority, assigneeId, labelId, status, search, callerId);
    }

    // ── Sprints ───────────────────────────────────────────────────────────────

    @GetMapping("/projects/{projectId}/sprints")
    public List<SprintResponseDto> listSprints(@PathVariable("projectId") UUID projectId,
                                               @AuthenticationPrincipal UUID callerId) {
        return sprintService.listSprints(projectId, callerId);
    }

    @GetMapping("/sprints/{sprintId}")
    public SprintResponseDto getSprint(@PathVariable("sprintId") UUID sprintId,
                                       @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprint(sprintId, callerId);
    }

    @GetMapping("/projects/{projectId}/velocity")
    public VelocityDto getVelocity(@PathVariable("projectId") UUID projectId,
                                   @AuthenticationPrincipal UUID callerId) {
        return sprintService.getVelocity(projectId, callerId);
    }

    @GetMapping("/sprints/{sprintId}/tasks")
    public List<TaskResponseDto> getSprintTasks(@PathVariable("sprintId") UUID sprintId,
                                                @RequestParam(required = false) List<String> priority,
                                                @RequestParam(required = false) List<UUID> assigneeId,
                                                @RequestParam(required = false) List<UUID> labelId,
                                                @RequestParam(required = false) String search,
                                                @RequestParam(required = false, defaultValue = "false") boolean includeStories,
                                                @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprintTasks(sprintId, priority, assigneeId, labelId, search, includeStories, callerId);
    }

    /** Returns root PBIs in the sprint (STORYs, BUGs, root TASKs) — for sprint backlog view */
    @GetMapping("/sprints/{sprintId}/stories")
    public List<TaskResponseDto> getSprintStories(@PathVariable("sprintId") UUID sprintId,
                                                   @RequestParam(required = false) List<String> priority,
                                                   @RequestParam(required = false) List<UUID> assigneeId,
                                                   @RequestParam(required = false) List<UUID> labelId,
                                                   @RequestParam(required = false) List<String> status,
                                                   @RequestParam(required = false) String search,
                                                   @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprintAllTasks(sprintId, priority, assigneeId, labelId, status, search, callerId);
    }

    @PostMapping("/projects/{projectId}/sprints")
    public ResponseEntity<SprintResponseDto> createSprint(
            @PathVariable("projectId") UUID projectId,
            @Valid @RequestBody CreateSprintRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(sprintService.createSprint(projectId, dto, callerId));
    }

    @PutMapping("/sprints/{sprintId}")
    public SprintResponseDto updateSprint(@PathVariable("sprintId") UUID sprintId,
                                          @Valid @RequestBody UpdateSprintRequestDto dto,
                                          @AuthenticationPrincipal UUID callerId) {
        return sprintService.updateSprint(sprintId, dto, callerId);
    }

    @PostMapping("/sprints/{sprintId}/activate")
    public SprintResponseDto activateSprint(@PathVariable("sprintId") UUID sprintId,
                                            @AuthenticationPrincipal UUID callerId) {
        return sprintService.activateSprint(sprintId, callerId);
    }

    @DeleteMapping("/sprints/{sprintId}")
    public ResponseEntity<Void> deleteSprint(@PathVariable("sprintId") UUID sprintId,
                                             @AuthenticationPrincipal UUID callerId) {
        sprintService.deleteSprint(sprintId, callerId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/sprints/{sprintId}/tasks")
    public List<TaskResponseDto> assignTasksToSprint(
            @PathVariable("sprintId") UUID sprintId,
            @RequestBody AssignTaskToSprintRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return sprintService.assignTasksToSprint(sprintId, dto, callerId);
    }

    @DeleteMapping("/sprints/{sprintId}/tasks/{taskId}")
    public TaskResponseDto removeTaskFromSprint(@PathVariable("sprintId") UUID sprintId,
                                                @PathVariable("taskId") UUID taskId,
                                                @AuthenticationPrincipal UUID callerId) {
        return sprintService.removeTaskFromSprint(sprintId, taskId, callerId);
    }

    @GetMapping("/sprints/{sprintId}/snapshots")
    public List<SprintTaskSnapshotDto> getSprintSnapshots(@PathVariable("sprintId") UUID sprintId,
                                                          @AuthenticationPrincipal UUID callerId) {
        return sprintService.getSprintSnapshots(sprintId, callerId);
    }
}