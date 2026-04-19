package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.UserSummaryDto;
import com.tfg.agile.app.user_service.service.UserProfileService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsersControllerTest {

    @Mock
    private UserProfileService userProfileService;

    @Test
    void batch_parsesIdsAndDelegatesToService() {
        UsersController controller = new UsersController(userProfileService);
        UUID userId = UUID.randomUUID();
        List<String> requestIds = List.of(userId.toString());
        List<UserSummaryDto> expected = List.of(new UserSummaryDto(userId, "john", "John Doe", null));

        when(userProfileService.batchLookup(List.of(userId))).thenReturn(expected);

        List<UserSummaryDto> response = controller.batch(requestIds);

        assertThat(response).isEqualTo(expected);
        verify(userProfileService).batchLookup(List.of(userId));
    }
}

