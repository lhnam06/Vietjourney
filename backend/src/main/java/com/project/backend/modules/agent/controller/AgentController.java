package com.project.backend.modules.agent.controller;

import com.project.backend.common.dto.ApiResponse;
import com.project.backend.modules.agent.dto.request.ExecutePlanRequest;
import com.project.backend.modules.agent.dto.response.ExecutePlanResponse;
import com.project.backend.modules.agent.service.AgentExecutionService;
import jakarta.validation.Valid;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for the Vietjourney Agent Feature.
 *
 * This controller exposes an endpoint that accepts a plan from the Hugging Face
 * planning agent (a timeline array) and executes it against the user's timeline
 * by delegating to {@link AgentExecutionService}.
 *
 * <h3>Authentication</h3>
 * Requires a valid JWT. The current user's permissions are used to check
 * timeline access (via {@code @timelineSecurity.canEditTimeline}).
 *
 * Cross-reference: {@code docs/Agent_Feature_Implementation_Plan.md §6}
 * Cross-reference: {@code d:\Study\HuggingFace\planning-agent\API_DOCS.md}
 */
@RestController
@RequestMapping("/api/v1/agent")
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class AgentController {

    AgentExecutionService agentExecutionService;

    /**
     * Execute a plan against the user's timeline.
     *
     * The user must have edit access to the target timeline.
     *
     * @param timelineId   the target timeline ID (from the plan request)
     * @param request      the execution plan payload
     * @return summary of per-event execution results
     */
    @PostMapping("/execute-plan")
    @PreAuthorize("@timelineSecurity.canEditTimeline(#request.timelineId)")
    public ApiResponse<ExecutePlanResponse> executePlan(
            @RequestBody @Valid ExecutePlanRequest request) {
        ExecutePlanResponse result = agentExecutionService.executePlan(request);
        return ApiResponse.<ExecutePlanResponse>builder()
                .result(result)
                .build();
    }
}
