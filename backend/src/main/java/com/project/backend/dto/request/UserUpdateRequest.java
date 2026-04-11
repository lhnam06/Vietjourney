package com.project.backend.dto.request;

import com.project.backend.validator.ValidationRegex;
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
public class UserUpdateRequest {
    @NotNull
    @Size(min = 8, message = "PASSWORD_SHORT")
    @Pattern(regexp = ValidationRegex.ONLY_KEYBOARD_CHARS, message = "INVALID_CHARS_PASSWORD")
    @Pattern(regexp = ValidationRegex.NO_SPACE, message = "PASSWORD_HAS_SPACE")
    @Pattern(regexp = ValidationRegex.HAS_LOWERCASE, message = "PASSWORD_MISS_LOWERCASE")
    @Pattern(regexp = ValidationRegex.HAS_UPPERCASE, message = "PASSWORD_MISS_UPPERCASE")
    @Pattern(regexp = ValidationRegex.HAS_DIGIT, message = "PASSWORD_MISS_DIGIT")
    @Pattern(regexp = ValidationRegex.HAS_SYMBOL, message = "PASSWORD_MISS_SYMBOL")
    String password;

    @NotBlank
    @Size(max = 50, message = "DISPLAY_NAME_LONG")
    String displayName;

}
