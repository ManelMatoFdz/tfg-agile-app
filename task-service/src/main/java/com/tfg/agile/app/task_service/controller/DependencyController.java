package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateDependencyRequestDto;
import com.tfg.agile.app.task_service.dto.TaskDependencyDto;
import com.tfg.agile.app.task_service.service.DependencyService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class DependencyController {

    private final DependencyService dependencyService;

    public DependencyController(DependencyService dependencyService) {
        this.dependencyService = dependencyService;
    }

    @PostMapping("/tasks/{taskId}/dependencies")
    public ResponseEntity<TaskDependencyDto> create(
            @PathVariable("taskId") UUID taskId,
            @Valid @RequestBody CreateDependencyRequestDto dto,
            @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(dependencyService.create(taskId, dto, callerId));
    }

    @GetMapping("/tasks/{taskId}/dependencies")
    public List<TaskDependencyDto> getByTask(
            @PathVariable("taskId") UUID taskId,
            @AuthenticationPrincipal UUID callerId) {
        return dependencyService.findByTask(taskId, callerId);
    }

    @DeleteMapping("/tasks/{taskId}/dependencies/{dependencyId}")
    public ResponseEntity<Void> delete(
            @PathVariable("taskId") UUID taskId,
            @PathVariable("dependencyId") UUID dependencyId,
            @AuthenticationPrincipal UUID callerId) {
        dependencyService.delete(taskId, dependencyId, callerId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/projects/{projectId}/dependencies")
    public List<TaskDependencyDto> getByProject(
            @PathVariable("projectId") UUID projectId,
            @AuthenticationPrincipal UUID callerId) {
        return dependencyService.findByProject(projectId, callerId);
    }
}
