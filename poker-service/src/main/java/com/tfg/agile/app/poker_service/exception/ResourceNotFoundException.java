package com.tfg.agile.app.poker_service.exception;

public class ResourceNotFoundException extends RuntimeException {
    private final String errorCode;
    public ResourceNotFoundException(String errorCode) {
        super(errorCode);
        this.errorCode = errorCode;
    }
    public String getErrorCode() { return errorCode; }
}