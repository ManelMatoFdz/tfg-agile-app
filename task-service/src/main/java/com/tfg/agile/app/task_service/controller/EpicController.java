package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.*;
import com.tfg.agile.app.task_service.service.EpicService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class EpicController {

    private final EpicService epicService;

    public EpicController(EpicService epicService) {
        this.epicService = epicService;
    }

    @GetMapping("/projects/{projectId}/epics")
    public List<EpicResponseDto> listByProject(@PathVariable("projectId") UUID projectId,
                                               @AuthenticationPrincipal UUID callerId) {
        return epicService.findByProject(projectId, callerId);
    }

    @GetMapping("/projects/{projectId}/epics/{epicId}")
    public EpicResponseDto getById(@PathVariable("projectId") UUID projectId,
                                   @PathVariable("epicId") UUID epicId,
                                   @AuthenticationPrincipal UUID callerId) {
        return epicService.findById(epicId, callerId);
    }

    @PostMapping("/projects/{projectId}/epics")
    public ResponseEntity<EpicResponseDto> create(@PathVariable("projectId") UUID projectId,
                                                  @Valid @RequestBody CreateEpicRequestDto dto,
                                                  @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(epicService.create(projectId, dto, callerId));
    }

    @PutMapping("/projects/{projectId}/epics/{epicId}")
    public EpicResponseDto update(@PathVariable("projectId") UUID projectId,
                                  @PathVariable("epicId") UUID epicId,
                                  @Valid @RequestBody UpdateEpicRequestDto dto,
                                  @AuthenticationPrincipal UUID callerId) {
        return epicService.update(epicId, dto, callerId);
    }

    @DeleteMapping("/projects/{projectId}/epics/{epicId}")
    public ResponseEntity<Void> delete(@PathVariable("projectId") UUID projectId,
                                       @PathVariable("epicId") UUID epicId,
                                       @AuthenticationPrincipal UUID callerId) {
        epicService.delete(epicId, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectId}/epics/{epicId}/tasks")
    public List<TaskResponseDto> getEpicTasks(@PathVariable("projectId") UUID projectId,
                                              @PathVariable("epicId") UUID epicId,
                                              @AuthenticationPrincipal UUID callerId) {
        return epicService.findTasksByEpic(epicId, callerId);
    }

    @PutMapping("/tasks/{taskId}/epic")
    public TaskResponseDto assignEpic(@PathVariable("taskId") UUID taskId,
                                      @RequestBody AssignEpicRequestDto dto,
                                      @AuthenticationPrincipal UUID callerId) {
        return epicService.assignEpicToTask(taskId, dto.epicId(), callerId);
    }
}