package com.project.backend.modules.timeline.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class SubmitProposalRequest {
    @NotBlank
    String changeType;
    
    @NotNull
    Map<String, Object> payload;
    
    @NotNull
    Integer baseVersion;
}
