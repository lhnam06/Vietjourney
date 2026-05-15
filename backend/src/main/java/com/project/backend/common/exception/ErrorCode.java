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

    ROLE_NOT_EXIST(4002, "Role does not exist", HttpStatus.BAD_REQUEST),
    PLACE_NOT_EXIST(4003, "Place does not exist", HttpStatus.BAD_REQUEST),
    INVALID_CATEGORY(4004, "Invalid category. Must be: food, drink or activity", HttpStatus.BAD_REQUEST),
    INVALID_PRICE_RANGE(4005, "minPrice must be less than or equal to maxPrice", HttpStatus.BAD_REQUEST),

    TIMELINE_NOT_EXIST(5001, "Timeline does not exist", HttpStatus.NOT_FOUND),
    TIMELINE_EVENT_NOT_EXIST(5002, "Timeline event does not exist", HttpStatus.NOT_FOUND),
    TIMELINE_MEMBER_NOT_EXIST(5003, "Timeline member does not exist", HttpStatus.NOT_FOUND),
    TIMELINE_MEMBER_ALREADY_EXISTS(5004, "Timeline member already exists", HttpStatus.BAD_REQUEST),
    INVALID_TIMELINE_DATE_RANGE(5005, "Timeline date range is invalid", HttpStatus.BAD_REQUEST),
    INVALID_TIMELINE_EVENT_RANGE(5006, "Timeline event time range is invalid", HttpStatus.BAD_REQUEST),
    TIMELINE_EVENT_OUTSIDE_TIMELINE_RANGE(5007, "Timeline event is outside the timeline date range", HttpStatus.BAD_REQUEST),
    TIMELINE_EVENT_OVERLAP(5008, "Timeline event overlaps with an existing event", HttpStatus.BAD_REQUEST),
    TIMELINE_ACCESS_DENIED(5009, "You do not have access to this timeline", HttpStatus.FORBIDDEN),
    TIMELINE_CONCURRENT_MODIFICATION(5010, "Timeline was modified concurrently, please retry", HttpStatus.CONFLICT),
    TIMELINE_INVITE_CODE_INVALID(5011, "Invalid or expired invite code", HttpStatus.BAD_REQUEST),

    NOTIFICATION_NOT_EXIST(6001, "Notification does not exist", HttpStatus.NOT_FOUND),
    NOTIFICATION_ACCESS_DENIED(6002, "You do not have access to this notification", HttpStatus.FORBIDDEN),
    
    PROPOSAL_NOT_FOUND(7001, "Proposal does not exist", HttpStatus.NOT_FOUND),
    INVALID_PROPOSAL_DATA(7002, "Invalid proposal data", HttpStatus.BAD_REQUEST),
    PROPOSAL_ALREADY_PROCESSED(7003, "Proposal already processed", HttpStatus.BAD_REQUEST);
    int code;
    String message;
    HttpStatusCode statusCode;

    ErrorCode(int code, String message, HttpStatusCode statusCode){
        this.code = code;
        this.message = message;
        this.statusCode = statusCode;
    }

}

