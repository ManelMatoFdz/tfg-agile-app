package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.dto.BoardColumnDto;
import com.tfg.agile.app.task_service.entity.BoardColumn;
import com.tfg.agile.app.task_service.repository.BoardColumnRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class BoardColumnService {

    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;

    public BoardColumnService(BoardColumnRepository boardColumnRepository,
                              TaskRepository taskRepository) {
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
    }

    @Transactional
    public List<BoardColumnDto> getColumns(UUID projectId) {
        List<BoardColumn> columns = boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId);
        if (columns.isEmpty()) {
            createDefaultColumns(projectId);
            columns = boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId);
        }
        return columns.stream().map(BoardColumnDto::from).toList();
    }

    @Transactional
    public List<BoardColumnDto> saveColumns(UUID projectId, List<BoardColumnDto> dtos) {
        boolean hasDoneEquivalent = dtos.stream().anyMatch(BoardColumnDto::doneEquivalent);
        if (!hasDoneEquivalent) {
            throw new IllegalArgumentException("AT_LEAST_ONE_DONE_EQUIVALENT_REQUIRED");
        }

        // Validate WIP limits against current task counts
        Map<String, Long> taskCountByStatus = taskRepository.findByProjectId(projectId).stream()
                .collect(Collectors.groupingBy(t -> t.getStatus(), Collectors.counting()));

        for (BoardColumnDto dto : dtos) {
            if (dto.wipLimit() != null && dto.wipLimit() > 0) {
                long currentCount = taskCountByStatus.getOrDefault(dto.name(), 0L);
                if (currentCount > dto.wipLimit()) {
                    throw new IllegalArgumentException(
                            "WIP_LIMIT_EXCEEDED:" + dto.name() + ":" + currentCount + ":" + dto.wipLimit());
                }
            }
        }

        // Delete existing and save new
        boardColumnRepository.deleteByProjectId(projectId);
        boardColumnRepository.flush();

        List<BoardColumn> newColumns = dtos.stream()
                .map(dto -> BoardColumn.builder()
                        .projectId(projectId)
                        .name(dto.name())
                        .position(dto.position())
                        .color(dto.color() != null ? dto.color() : "#6B7280")
                        .wipLimit(dto.wipLimit())
                        .doneEquivalent(dto.doneEquivalent())
                        .build())
                .toList();

        return boardColumnRepository.saveAll(newColumns).stream()
                .map(BoardColumnDto::from)
                .toList();
    }

    @Transactional
    public void createDefaultColumns(UUID projectId) {
        if (boardColumnRepository.countByProjectId(projectId) > 0) return;

        List<BoardColumn> defaults = List.of(
                BoardColumn.builder().projectId(projectId).name("TODO").position(0).color("#6B7280").doneEquivalent(false).build(),
                BoardColumn.builder().projectId(projectId).name("IN_PROGRESS").position(1).color("#3B82F6").doneEquivalent(false).build(),
                BoardColumn.builder().projectId(projectId).name("IN_REVIEW").position(2).color("#F59E0B").doneEquivalent(false).build(),
                BoardColumn.builder().projectId(projectId).name("DONE").position(3).color("#22C55E").doneEquivalent(true).build()
        );
        boardColumnRepository.saveAll(defaults);
    }

    @Transactional(readOnly = true)
    public boolean isDoneEquivalent(UUID projectId, String status) {
        List<BoardColumn> columns = boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId);
        return columns.stream()
                .anyMatch(c -> c.getName().equals(status) && c.isDoneEquivalent());
    }

    @Transactional(readOnly = true)
    public Set<String> getDoneEquivalentStatuses(UUID projectId) {
        return boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId).stream()
                .filter(BoardColumn::isDoneEquivalent)
                .map(BoardColumn::getName)
                .collect(Collectors.toSet());
    }

    @Transactional(readOnly = true)
    public String getFirstColumnName(UUID projectId) {
        List<BoardColumn> columns = boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId);
        if (columns.isEmpty()) return "TODO";
        return columns.get(0).getName();
    }

    @Transactional(readOnly = true)
    public void checkWipLimit(UUID projectId, String targetStatus) {
        List<BoardColumn> columns = boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId);
        for (BoardColumn col : columns) {
            if (col.getName().equals(targetStatus) && col.getWipLimit() != null && col.getWipLimit() > 0) {
                long currentCount = taskRepository.countByProjectIdAndStatus(projectId, targetStatus);
                if (currentCount >= col.getWipLimit()) {
                    throw new IllegalArgumentException(
                            "WIP_LIMIT_EXCEEDED:" + col.getName() + ":" + currentCount + ":" + col.getWipLimit());
                }
                break;
            }
        }
    }
}