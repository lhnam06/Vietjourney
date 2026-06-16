package com.project.backend.modules.agent.dto.request;

/**
 * Execution mode for the Vietjourney Agent Feature.
 *
 * {@code DIRECT_ADD} — events are added directly to the timeline.
 * {@code PROPOSAL}   — events are submitted as proposals for group approval.
 */
public enum ExecutionMode {
    DIRECT_ADD,
    PROPOSAL
}
