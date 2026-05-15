package com.tfg.agile.app.task_service.exception;

public class ForbiddenException extends RuntimeException {
    private final String errorCode;

    public ForbiddenException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }

    public String getErrorCode() { return errorCode; }
}