package com.tfg.agile.app.user_service.controller;

import com.tfg.agile.app.user_service.dto.AuthResponseDto;
import com.tfg.agile.app.user_service.dto.ForgotPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.GoogleLoginRequestDto;
import com.tfg.agile.app.user_service.dto.LoginRequestDto;
import com.tfg.agile.app.user_service.dto.MessageResponseDto;
import com.tfg.agile.app.user_service.dto.RefreshTokenRequestDto;
import com.tfg.agile.app.user_service.dto.RegisterRequestDto;
import com.tfg.agile.app.user_service.dto.ResetPasswordRequestDto;
import com.tfg.agile.app.user_service.dto.UserResponseDto;
import com.tfg.agile.app.user_service.exception.InvalidCredentialsException;
import com.tfg.agile.app.user_service.service.AuthService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private AuthService authService;

    @Test
    void endpoints_delegateToAuthService() {
        AuthController controller = new AuthController(authService);
        AuthResponseDto authResponse = new AuthResponseDto("access", "refresh", null);
        MessageResponseDto messageResponse = new MessageResponseDto("ok");

        RegisterRequestDto registerRequest = new RegisterRequestDto("john", "john@example.com", "secret123");
        LoginRequestDto loginRequest = new LoginRequestDto("john@example.com", "secret123");
        GoogleLoginRequestDto googleRequest = new GoogleLoginRequestDto("id-token");
        ForgotPasswordRequestDto forgotPasswordRequest = new ForgotPasswordRequestDto("john@example.com");
        ResetPasswordRequestDto resetPasswordRequest = new ResetPasswordRequestDto("reset", "new-secret");
        RefreshTokenRequestDto refreshRequest = new RefreshTokenRequestDto("refresh-token");

        when(authService.register(registerRequest)).thenReturn(authResponse);
        when(authService.login(loginRequest)).thenReturn(authResponse);
        when(authService.googleLogin(googleRequest)).thenReturn(authResponse);
        when(authService.forgotPassword(forgotPasswordRequest)).thenReturn(messageResponse);
        when(authService.resetPassword(resetPasswordRequest)).thenReturn(messageResponse);
        when(authService.refresh(refreshRequest)).thenReturn(authResponse);
        when(authService.logout(refreshRequest)).thenReturn(messageResponse);

        assertThat(controller.register(registerRequest)).isSameAs(authResponse);
        assertThat(controller.login(loginRequest)).isSameAs(authResponse);
        assertThat(controller.googleLogin(googleRequest)).isSameAs(authResponse);
        assertThat(controller.forgotPassword(forgotPasswordRequest)).isSameAs(messageResponse);
        assertThat(controller.resetPassword(resetPasswordRequest)).isSameAs(messageResponse);
        assertThat(controller.refresh(refreshRequest)).isSameAs(authResponse);
        assertThat(controller.logout(refreshRequest)).isSameAs(messageResponse);

        verify(authService).register(registerRequest);
        verify(authService).login(loginRequest);
        verify(authService).googleLogin(googleRequest);
        verify(authService).forgotPassword(forgotPasswordRequest);
        verify(authService).resetPassword(resetPasswordRequest);
        verify(authService).refresh(refreshRequest);
        verify(authService).logout(refreshRequest);
    }

    @Test
    void me_returnsCurrentUserWhenPrincipalContainsValidUuid() {
        AuthController controller = new AuthController(authService);
        UUID userId = UUID.randomUUID();
        Authentication authentication = new TestingAuthenticationToken(userId.toString(), null);
        UserResponseDto expected = new UserResponseDto(userId, "john", "john@example.com", Instant.now(), true);

        when(authService.me(userId)).thenReturn(expected);

        UserResponseDto response = controller.me(authentication);

        assertThat(response).isSameAs(expected);
        verify(authService).me(userId);
    }

    @Test
    void me_throwsWhenPrincipalIsMissingOrInvalid() {
        AuthController controller = new AuthController(authService);

        assertThatThrownBy(() -> controller.me(null)).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> controller.me(new TestingAuthenticationToken("", null))).isInstanceOf(InvalidCredentialsException.class);
        assertThatThrownBy(() -> controller.me(new TestingAuthenticationToken("not-a-uuid", null))).isInstanceOf(InvalidCredentialsException.class);
    }
}

