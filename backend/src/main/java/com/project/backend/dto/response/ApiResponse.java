package com.project.backend.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@JsonInclude
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ApiResponse<T>{
    @Builder.Default
    int code = 1000;

    String message;
    T result;
}
