package com.tfg.agile.app.task_service.exception;

import org.junit.jupiter.api.Test;
import org.springframework.core.MethodParameter;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.lang.reflect.Method;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void handleNotFound_returns404() {
        ResponseEntity<Map<String, Object>> response = handler.handleNotFound(new ResourceNotFoundException("Task not found"));

        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsEntry("message", "Task not found");
    }

    @Test
    void handleForbidden_returns403() {
        ResponseEntity<Map<String, Object>> response = handler.handleForbidden(new ForbiddenException("Forbidden"));

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).containsEntry("message", "Forbidden");
    }

    @Test
    void handleConflict_returns409() {
        ResponseEntity<Map<String, Object>> response = handler.handleConflict(new ConflictException("Conflict"));

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).containsEntry("message", "Conflict");
    }

    @Test
    void handleBadArg_returns400() {
        ResponseEntity<Map<String, Object>> response = handler.handleBadArg(new IllegalArgumentException("Bad argument"));

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).containsEntry("message", "Bad argument");
    }

    @Test
    void handleValidation_returnsFirstFieldError() throws Exception {
        BeanPropertyBindingResult bindingResult = new BeanPropertyBindingResult(new DummyRequest(), "dummy");
        bindingResult.addError(new FieldError("dummy", "title", "must not be blank"));
        bindingResult.addError(new FieldError("dummy", "priority", "must be valid"));

        Method method = DummyController.class.getDeclaredMethod("dummy", DummyRequest.class);
        MethodParameter parameter = new MethodParameter(method, 0);
        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(parameter, bindingResult);

        ResponseEntity<Map<String, Object>> response = handler.handleValidation(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody().get("message")).isEqualTo("title: must not be blank");
    }

    private static class DummyController {
        @SuppressWarnings("unused")
        public void dummy(DummyRequest request) {
        }
    }

    private static class DummyRequest {
        @SuppressWarnings("unused")
        private String title;
    }
}

