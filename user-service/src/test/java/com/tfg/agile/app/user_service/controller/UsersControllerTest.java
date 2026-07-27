package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.UserLookupResponseDto;
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

    @Test
    void lookup_delegatesToService() {
        UsersController controller = new UsersController(userProfileService);
        String email = "john@example.com";
        UserLookupResponseDto expected = new UserLookupResponseDto(
                UUID.randomUUID(), "jdoe", "John Doe", email, null);

        when(userProfileService.lookupByEmail(email)).thenReturn(expected);

        UserLookupResponseDto response = controller.lookup(email);

        assertThat(response).isEqualTo(expected);
        verify(userProfileService).lookupByEmail(email);
    }
}

