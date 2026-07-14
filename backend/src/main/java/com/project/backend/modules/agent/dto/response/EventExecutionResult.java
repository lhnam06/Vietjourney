package com.project.backend.modules.agent.dto.response;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Result of executing a single proposed event.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class EventExecutionResult {
    /** Index in the original timeline array. */
    int index;

    /** Execution status. */
    EventStatus status;

    /** Human-readable label (e.g. "Cafe at Quán Cafe Yên"). */
    String label;

    /** ID of the created event or proposal (if successful). */
    String entityId;

    /** Error message (if status is ERROR). */
    String errorMessage;
}
