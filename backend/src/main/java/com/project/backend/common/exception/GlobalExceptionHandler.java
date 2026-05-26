package com.project.backend.common.exception;

import com.project.backend.common.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.InvalidDataAccessApiUsageException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {
    // Exception Thrown By App
    @ExceptionHandler(value = AppException.class)
    ResponseEntity<ApiResponse> handlingAppException(AppException exception){
        ErrorCode errorCode = exception.getErrorCode();

        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());

        return ResponseEntity.status(errorCode.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ApiResponse> handlingMethodNotSupported(HttpRequestMethodNotSupportedException exception) {
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.METHOD_NOT_ALLOWED.getCode());
        apiResponse.setMessage(ErrorCode.METHOD_NOT_ALLOWED.getMessage());

        return ResponseEntity.status(ErrorCode.METHOD_NOT_ALLOWED.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = HttpMessageNotReadableException.class)
    ResponseEntity<ApiResponse> handlingInvalidBody(HttpMessageNotReadableException exception) {
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.INVALID_REQUEST_BODY.getCode());
        apiResponse.setMessage(ErrorCode.INVALID_REQUEST_BODY.getMessage());

        return ResponseEntity.status(ErrorCode.INVALID_REQUEST_BODY.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = DataIntegrityViolationException.class)
    ResponseEntity<ApiResponse> handlingDataIntegrityViolation(DataIntegrityViolationException exception) {
        log.error("DataIntegrityViolationException: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        // Surface the constraint name if available so the client can diagnose
        String cause = exception.getMostSpecificCause().getMessage();
        if (cause != null && cause.contains("unique")) {
            apiResponse.setCode(1007);
            apiResponse.setMessage("Dữ liệu bị trùng lặp: " + cause);
        } else if (cause != null && cause.contains("not-null") || (cause != null && cause.contains("null"))) {
            apiResponse.setCode(1008);
            apiResponse.setMessage("Dữ liệu bắt buộc bị thiếu: " + cause);
        } else {
            apiResponse.setCode(1009);
            apiResponse.setMessage("Vi phạm ràng buộc dữ liệu" + (cause != null ? ": " + cause : ""));
        }
        return ResponseEntity.badRequest().body(apiResponse);
    }

    @ExceptionHandler(value = InvalidDataAccessApiUsageException.class)
    ResponseEntity<ApiResponse> handlingInvalidDataAccess(InvalidDataAccessApiUsageException exception) {
        log.error("InvalidDataAccessApiUsageException: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(1010);
        apiResponse.setMessage("Truy vấn dữ liệu không hợp lệ: " + exception.getMostSpecificCause().getMessage());
        return ResponseEntity.badRequest().body(apiResponse);
    }

    // Exception (Unexpected) Thrown By System
    @ExceptionHandler(value = Exception.class)
    ResponseEntity<ApiResponse> handlingRuntimeException(Exception exception){
        log.error("Exception: ", exception);
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.UNCATEGORIZED_EXCEPTION.getCode());
        apiResponse.setMessage(ErrorCode.UNCATEGORIZED_EXCEPTION.getMessage() + " [" + exception.getClass().getSimpleName() + ": " + exception.getMessage() + "]");

        return ResponseEntity.badRequest().body(apiResponse);
    }

    // Validation Exception Thrown By DTO
    @ExceptionHandler(value = MethodArgumentNotValidException.class)
    ResponseEntity<ApiResponse> handlingValidationException(MethodArgumentNotValidException exception){
        FieldError fieldError = exception.getFieldError();
        ErrorCode errorCode = ErrorCode.INVALID_KEY;
        if(fieldError != null){
            String enumKey = fieldError.getDefaultMessage();
            try{
                errorCode = ErrorCode.valueOf(enumKey);
            } catch (IllegalArgumentException e){
                // Skip error if enumKey doesn't match any enum
            }
        }

        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(errorCode.getCode());
        apiResponse.setMessage(errorCode.getMessage());

        return ResponseEntity.status(errorCode.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = AccessDeniedException.class)
    ResponseEntity<ApiResponse> handlingAccessDeniedException(AccessDeniedException exception) {
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.TIMELINE_ACCESS_DENIED.getCode());
        apiResponse.setMessage(ErrorCode.TIMELINE_ACCESS_DENIED.getMessage());

        return ResponseEntity.status(ErrorCode.TIMELINE_ACCESS_DENIED.getStatusCode()).body(apiResponse);
    }

    @ExceptionHandler(value = ObjectOptimisticLockingFailureException.class)
    ResponseEntity<ApiResponse> handlingOptimisticLockException(ObjectOptimisticLockingFailureException exception) {
        ApiResponse apiResponse = new ApiResponse();
        apiResponse.setCode(ErrorCode.TIMELINE_CONCURRENT_MODIFICATION.getCode());
        apiResponse.setMessage(ErrorCode.TIMELINE_CONCURRENT_MODIFICATION.getMessage());

        return ResponseEntity.status(ErrorCode.TIMELINE_CONCURRENT_MODIFICATION.getStatusCode()).body(apiResponse);
    }
}
