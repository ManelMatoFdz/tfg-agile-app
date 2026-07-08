package com.tfg.agile.app.task_service.controller;

import com.tfg.agile.app.task_service.dto.CreateLabelRequestDto;
import com.tfg.agile.app.task_service.dto.LabelDto;
import com.tfg.agile.app.task_service.dto.UpdateLabelRequestDto;
import com.tfg.agile.app.task_service.service.LabelService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
public class LabelController {

    private final LabelService labelService;

    public LabelController(LabelService labelService) {
        this.labelService = labelService;
    }

    @GetMapping("/projects/{projectId}/labels")
    public List<LabelDto> listByProject(@PathVariable("projectId") UUID projectId,
                                        @AuthenticationPrincipal UUID callerId) {
        return labelService.findByProject(projectId, callerId);
    }

    @PostMapping("/projects/{projectId}/labels")
    public ResponseEntity<LabelDto> create(@PathVariable("projectId") UUID projectId,
                                           @Valid @RequestBody CreateLabelRequestDto dto,
                                           @AuthenticationPrincipal UUID callerId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(labelService.create(projectId, dto, callerId));
    }

    @PutMapping("/labels/{labelId}")
    public LabelDto update(@PathVariable("labelId") UUID labelId,
                           @Valid @RequestBody UpdateLabelRequestDto dto,
                           @AuthenticationPrincipal UUID callerId) {
        return labelService.update(labelId, dto, callerId);
    }

    @DeleteMapping("/labels/{labelId}")
    public ResponseEntity<Void> delete(@PathVariable("labelId") UUID labelId,
                                       @AuthenticationPrincipal UUID callerId) {
        labelService.delete(labelId, callerId);
        return ResponseEntity.noContent().build();
    }
}