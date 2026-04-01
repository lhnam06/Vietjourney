package com.project.backend.exception;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum  ErrorCode {
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized Error", HttpStatus.INTERNAL_SERVER_ERROR),
    USER_NOT_EXIST(1001, "Unexist Account", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1002, "Incorrect Username or Password", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1003, "No Access Permission", HttpStatus.UNAUTHORIZED);

    int code;
    String message;
    HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode){
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

}

