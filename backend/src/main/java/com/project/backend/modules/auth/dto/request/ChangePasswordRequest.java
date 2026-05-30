package com.project.backend.modules.auth.dto.request;

import com.project.backend.common.validator.ValidationRegex;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Builder
public class ChangePasswordRequest {

    @NotBlank(message = "OLD_PASSWORD_REQUIRED")
    String oldPassword;

    @NotNull
    @Size(min = 8, message = "PASSWORD_SHORT")
    @Pattern(regexp = ValidationRegex.ONLY_KEYBOARD_CHARS, message = "INVALID_CHARS_PASSWORD")
    @Pattern(regexp = ValidationRegex.NO_SPACE, message = "PASSWORD_HAS_SPACE")
    @Pattern(regexp = ValidationRegex.HAS_LETTER, message = "PASSWORD_MISS_LETTER")
    @Pattern(regexp = ValidationRegex.HAS_DIGIT, message = "PASSWORD_MISS_DIGIT")
    String newPassword;
}
