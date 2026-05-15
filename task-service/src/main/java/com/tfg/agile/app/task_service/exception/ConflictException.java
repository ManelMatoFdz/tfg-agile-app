package com.tfg.agile.app.task_service.exception;

public class ConflictException extends RuntimeException {
    private final String errorCode;

    public ConflictException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}