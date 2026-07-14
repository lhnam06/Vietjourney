package com.project.backend.modules.agent.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;
import lombok.experimental.FieldDefaults;

import java.util.List;

/**
 * Request payload for the Agent Execution endpoint.
 *
 * Consumed from the Hugging Face agent's `timeline` array output
 * (see docs/Agent_Feature_Implementation_Plan.md §3.0) and forwarded
 * to the Vietjourney backend via {@code POST /api/v1/agent/execute-plan}.
 *
 * Cross-reference: {@code d:\Study\HuggingFace\planning-agent\API_DOCS.md}
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ExecutePlanRequest {

    /** HF agent timeline array — each item is a proposed event. */
    @NotEmpty
    @Valid
    List<ProposedEvent> timeline;

    /** The target trip timeline ID. */
    @NotBlank
    String timelineId;

    /** Start date for time calculations (yyyy-MM-dd, e.g. "2026-07-20"). */
    @NotBlank
    String startDate;

    /** Execution mode: DIRECT_ADD or PROPOSAL. */
    @NotNull
    ExecutionMode mode;
}
