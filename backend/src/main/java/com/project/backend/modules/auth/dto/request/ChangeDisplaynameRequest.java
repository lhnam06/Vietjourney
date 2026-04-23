package com.project.backend.modules.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@AllArgsConstructor
@NoArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class ChangeDisplaynameRequest {
    @NotBlank
    @Size(max = 50, message = "DISPLAY_NAME_LONG")
    String displayName;
}
