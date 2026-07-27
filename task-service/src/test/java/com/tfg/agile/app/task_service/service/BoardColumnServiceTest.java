package com.tfg.agile.app.task_service.service;

import com.tfg.agile.app.task_service.entity.BoardColumn;
import com.tfg.agile.app.task_service.entity.Task;
import com.tfg.agile.app.task_service.dto.BoardColumnDto;
import com.tfg.agile.app.task_service.repository.BoardColumnRepository;
import com.tfg.agile.app.task_service.repository.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BoardColumnServiceTest {

    @Mock
    private BoardColumnRepository boardColumnRepository;
    @Mock
    private TaskRepository taskRepository;

    private BoardColumnService service;

    @BeforeEach
    void setUp() {
        service = new BoardColumnService(boardColumnRepository, taskRepository);
    }

    @Test
    void getColumns_returnsExistingColumns() {
        UUID projectId = UUID.randomUUID();
        BoardColumn col = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("TODO")
                .position(0)
                .color("#6B7280")
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(col));

        var result = service.getColumns(projectId);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).name()).isEqualTo("TODO");
    }

    @Test
    void getColumns_createsDefaultsWhenEmpty() {
        UUID projectId = UUID.randomUUID();

        // First call returns empty, second call returns the defaults
        BoardColumn todo = BoardColumn.builder().id(UUID.randomUUID()).projectId(projectId).name("TODO").position(0).color("#6B7280").doneEquivalent(false).build();
        BoardColumn inProgress = BoardColumn.builder().id(UUID.randomUUID()).projectId(projectId).name("IN_PROGRESS").position(1).color("#3B82F6").doneEquivalent(false).build();
        BoardColumn inReview = BoardColumn.builder().id(UUID.randomUUID()).projectId(projectId).name("IN_REVIEW").position(2).color("#F59E0B").doneEquivalent(false).build();
        BoardColumn done = BoardColumn.builder().id(UUID.randomUUID()).projectId(projectId).name("DONE").position(3).color("#22C55E").doneEquivalent(true).build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId))
                .thenReturn(List.of())
                .thenReturn(List.of(todo, inProgress, inReview, done));
        when(boardColumnRepository.countByProjectId(projectId)).thenReturn(0L);
        when(boardColumnRepository.saveAll(anyList())).thenReturn(List.of(todo, inProgress, inReview, done));

        var result = service.getColumns(projectId);

        assertThat(result).hasSize(4);
        verify(boardColumnRepository).saveAll(anyList());
    }

    @Test
    void saveColumns_replacesExisting() {
        UUID projectId = UUID.randomUUID();
        BoardColumnDto doneCol = new BoardColumnDto(null, "DONE", 0, "#22C55E", null, true);

        when(taskRepository.findByProjectId(projectId)).thenReturn(List.of());
        when(boardColumnRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        var result = service.saveColumns(projectId, List.of(doneCol));

        verify(boardColumnRepository).deleteByProjectId(projectId);
        verify(boardColumnRepository).flush();
        assertThat(result).hasSize(1);
    }

    @Test
    void saveColumns_throwsWhenNoDoneEquivalent() {
        UUID projectId = UUID.randomUUID();
        BoardColumnDto todoCol = new BoardColumnDto(null, "TODO", 0, "#6B7280", null, false);

        assertThatThrownBy(() -> service.saveColumns(projectId, List.of(todoCol)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("AT_LEAST_ONE_DONE_EQUIVALENT_REQUIRED");
    }

    @Test
    void saveColumns_throwsWhenWipLimitExceeded() {
        UUID projectId = UUID.randomUUID();
        BoardColumnDto col = new BoardColumnDto(null, "IN_PROGRESS", 0, "#3B82F6", 2, false);
        BoardColumnDto doneCol = new BoardColumnDto(null, "DONE", 1, "#22C55E", null, true);

        Task task1 = new Task();
        task1.setStatus("IN_PROGRESS");
        Task task2 = new Task();
        task2.setStatus("IN_PROGRESS");
        Task task3 = new Task();
        task3.setStatus("IN_PROGRESS");

        when(taskRepository.findByProjectId(projectId)).thenReturn(List.of(task1, task2, task3));

        assertThatThrownBy(() -> service.saveColumns(projectId, List.of(col, doneCol)))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageStartingWith("WIP_LIMIT_EXCEEDED:");
    }

    @Test
    void createDefaultColumns_skipsWhenColumnsExist() {
        UUID projectId = UUID.randomUUID();

        when(boardColumnRepository.countByProjectId(projectId)).thenReturn(4L);

        service.createDefaultColumns(projectId);

        verify(boardColumnRepository, never()).saveAll(anyList());
    }

    @Test
    void isDoneEquivalent_returnsTrueForDoneColumn() {
        UUID projectId = UUID.randomUUID();
        BoardColumn doneCol = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("DONE")
                .position(3)
                .color("#22C55E")
                .doneEquivalent(true)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(doneCol));

        assertThat(service.isDoneEquivalent(projectId, "DONE")).isTrue();
    }

    @Test
    void isDoneEquivalent_returnsFalseForTodoColumn() {
        UUID projectId = UUID.randomUUID();
        BoardColumn todoCol = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("TODO")
                .position(0)
                .color("#6B7280")
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(todoCol));

        assertThat(service.isDoneEquivalent(projectId, "TODO")).isFalse();
    }

    @Test
    void getDoneEquivalentStatuses_returnsSetOfDoneNames() {
        UUID projectId = UUID.randomUUID();
        BoardColumn doneCol = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("DONE")
                .position(3)
                .color("#22C55E")
                .doneEquivalent(true)
                .build();
        BoardColumn todoCol = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("TODO")
                .position(0)
                .color("#6B7280")
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(todoCol, doneCol));

        Set<String> result = service.getDoneEquivalentStatuses(projectId);

        assertThat(result).containsExactly("DONE");
    }

    @Test
    void getFirstColumnName_returnsFirstByPosition() {
        UUID projectId = UUID.randomUUID();
        BoardColumn todoCol = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("BACKLOG")
                .position(0)
                .color("#6B7280")
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(todoCol));

        assertThat(service.getFirstColumnName(projectId)).isEqualTo("BACKLOG");
    }

    @Test
    void getFirstColumnName_returnsTodoWhenNoColumns() {
        UUID projectId = UUID.randomUUID();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of());

        assertThat(service.getFirstColumnName(projectId)).isEqualTo("TODO");
    }

    @Test
    void checkWipLimit_throwsWhenLimitReached() {
        UUID projectId = UUID.randomUUID();
        BoardColumn col = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("IN_PROGRESS")
                .position(1)
                .color("#3B82F6")
                .wipLimit(3)
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(col));
        when(taskRepository.countByProjectIdAndStatus(projectId, "IN_PROGRESS")).thenReturn(3L);

        assertThatThrownBy(() -> service.checkWipLimit(projectId, "IN_PROGRESS"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageStartingWith("WIP_LIMIT_EXCEEDED:");
    }

    @Test
    void checkWipLimit_passesWhenUnderLimit() {
        UUID projectId = UUID.randomUUID();
        BoardColumn col = BoardColumn.builder()
                .id(UUID.randomUUID())
                .projectId(projectId)
                .name("IN_PROGRESS")
                .position(1)
                .color("#3B82F6")
                .wipLimit(5)
                .doneEquivalent(false)
                .build();

        when(boardColumnRepository.findByProjectIdOrderByPositionAsc(projectId)).thenReturn(List.of(col));
        when(taskRepository.countByProjectIdAndStatus(projectId, "IN_PROGRESS")).thenReturn(2L);

        // Should not throw
        service.checkWipLimit(projectId, "IN_PROGRESS");
    }
}