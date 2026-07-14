package com.project.backend.modules.community.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreateCommunityPostRequest {
    @NotBlank
    String timelineId;

    String caption;

    List<String> tags;
}
