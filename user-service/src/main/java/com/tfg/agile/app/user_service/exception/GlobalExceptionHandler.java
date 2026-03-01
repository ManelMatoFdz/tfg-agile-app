package com.tfg.agile.app.user_service.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> validation(MethodArgumentNotValidException ex) {
        return ResponseEntity.badRequest().body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 400,
                "error", "VALIDATION_ERROR",
                "message", "Invalid request body"
        ));
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> runtime(RuntimeException ex) {
        String code = ex.getMessage();

        if ("EMAIL_ALREADY_EXISTS".equals(code)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 409,
                    "error", code,
                    "message", "Email already exists"
            ));
        }

        if ("INVALID_CREDENTIALS".equals(code)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 401,
                    "error", code,
                    "message", "Invalid credentials"
            ));
        }

        if ("USER_NOT_FOUND".equals(code)) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "timestamp", Instant.now().toString(),
                    "status", 404,
                    "error", code,
                    "message", "User not found"
            ));
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "timestamp", Instant.now().toString(),
                "status", 500,
                "error", "INTERNAL_ERROR",
                "message", "Unexpected error"
        ));
    }
}
