package com.tfg.agile.app.poker_service.controller;

import com.tfg.agile.app.poker_service.repository.PokerSessionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class InternalPokerControllerTest {

    @Mock
    private PokerSessionRepository pokerSessionRepository;

    @Test
    void deleteProjectData_delegatesToRepository() {
        InternalPokerController controller = new InternalPokerController(pokerSessionRepository);
        UUID projectId = UUID.randomUUID();

        var response = controller.deleteProjectData(projectId);

        assertThat(response.getStatusCode().value()).isEqualTo(204);
        verify(pokerSessionRepository).deleteByProjectId(projectId);
    }
}