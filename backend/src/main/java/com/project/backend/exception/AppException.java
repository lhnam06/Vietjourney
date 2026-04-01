package com.project.backend.exception;

public class AppException  extends RuntimeException {
    private ErrorCode errorCode;

    public AppException(ErrorCode errorcode){
        super(errorcode.getMessage());
        this.errorCode = errorcode;
    }

    public ErrorCode getErrorCode(){
        return errorCode;
    }
}
