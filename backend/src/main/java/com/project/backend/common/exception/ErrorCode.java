package com.project.backend.common.exception;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;

@Getter
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public enum  ErrorCode {
    // System & Authorization Error
    UNCATEGORIZED_EXCEPTION(9999, "Uncategorized Error", HttpStatus.INTERNAL_SERVER_ERROR),
    USER_NOT_EXIST(1001, "Unexist Account", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED(1002, "Incorrect Username or Password", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED(1003, "No Access Permission", HttpStatus.UNAUTHORIZED),
    USER_EXISTED(1004, "User already exists!", HttpStatus.BAD_REQUEST),
    METHOD_NOT_ALLOWED(1005, "Method not allowed", HttpStatus.METHOD_NOT_ALLOWED),
    INVALID_REQUEST_BODY(1006, "Invalid request body", HttpStatus.BAD_REQUEST),

    // Validation Regex Error
    INVALID_KEY(8888, "Invalid Message Key", HttpStatus.BAD_REQUEST),

    // username:
    INVALID_USERNAME_LENGTH(2001, "Username must be between 5 and 30 characters", HttpStatus.BAD_REQUEST),
    INVALID_CHARS_USERNAME(2002, "Username contains invalid characters", HttpStatus.BAD_REQUEST),
    USERNAME_HAS_SPACE(2003, "Username must not contain space [_]", HttpStatus.BAD_REQUEST),
    USERNAME_EXISTS(2004, "This username already existed", HttpStatus.BAD_REQUEST),

    // password:
    PASSWORD_SHORT(3001, "Password must be at least 8 characters", HttpStatus.BAD_REQUEST),
    INVALID_CHARS_PASSWORD(3002, "Password contains invalid characters", HttpStatus.BAD_REQUEST),
    PASSWORD_MISS_DIGIT(3003, "Password must contain at least one digit", HttpStatus.BAD_REQUEST),
    PASSWORD_MISS_SYMBOL(3004, "Password must contain at least one special character", HttpStatus.BAD_REQUEST),
    PASSWORD_MISS_LOWERCASE(3005, "Password must contain at least one lowercase letter", HttpStatus.BAD_REQUEST),
    PASSWORD_MISS_UPPERCASE(3006, "Password must contain at least one uppercase letter", HttpStatus.BAD_REQUEST),
    PASSWORD_HAS_SPACE(3007, "Password must not contain space [_]", HttpStatus.BAD_REQUEST),
    PASSWORD_INCORRECT(3008, "Password is incorrect", HttpStatus.BAD_REQUEST),
    OLD_PASSWORD_REQUIRED(3009, "Old pasword cannot be blank", HttpStatus.BAD_REQUEST),
    // display name:
    DISPLAY_NAME_LONG(4001, "Display name must not exceed 50 characters", HttpStatus.BAD_REQUEST),

    ROLE_NOT_EXIST(4001, "Role does not exist", HttpStatus.BAD_REQUEST),

    INVALID_CATEGORY(5001, "Invalid category. Must be: food, drink or activity", HttpStatus.BAD_REQUEST),
    INVALID_PRICE_RANGE(5002, "minPrice must be less than or equal to maxPrice", HttpStatus.BAD_REQUEST);
    int code;
    String message;
    HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode){
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

}

