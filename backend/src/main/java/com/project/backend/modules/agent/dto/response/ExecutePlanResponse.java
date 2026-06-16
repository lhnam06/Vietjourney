package com.project.backend.modules.agent.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Summary response after executing a plan against the timeline.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExecutePlanResponse {
    int totalEvents;
    int successCount;
    int skippedCount;
    int errorCount;
    List<EventExecutionResult> results;
}
