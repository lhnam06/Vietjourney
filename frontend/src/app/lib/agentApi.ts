/**
 * Agent API client.
 *
 * Two responsibilities:
 * 1. Call the Hugging Face planning agent to get a structured itinerary plan.
 * 2. Call the Vietjourney backend `/api/v1/agent/execute-plan` endpoint to
 *    execute the plan against the current user's timeline.
 *
 * Cross-reference: `d:\Study\HuggingFace\planning-agent\API_DOCS.md`
 */
import { requestJson } from './api';

/* ------------------------------------------------------------------ */
/*  Hugging Face agent types                                           */
/* ------------------------------------------------------------------ */

export type HfTimelineEvent = {
  time: string;           // "08:00 - 10:00"
  activity: string;       // "Uống cafe"
  location: string;       // "Quán Cafe Yên"
  location_id?: string | null; // UUID from Supabase (optional)
  cost_estimate?: string | null;
};

export type HfPlanResponse =
  | { status: 'chat'; total_cost: string; itinerary_markdown: string; timeline: [] }
  | { status: 'success'; total_cost: string; itinerary_markdown: string; timeline: HfTimelineEvent[] };

const HF_API_BASE = 'https://youmei295-planning-agent.hf.space';

/**
 * Call the Hugging Face planning agent to generate a trip plan.
 */
export async function callHuggingFaceAgent(
  message: string,
  startDate?: string | null,
  numDays?: number | null,
  sessionId?: string | null,
): Promise<HfPlanResponse> {
  const body: Record<string, unknown> = { message };
  if (startDate) body.start_date = startDate;
  if (numDays != null) body.num_days = numDays;
  if (sessionId) body.session_id = sessionId;

  const res = await fetch(`${HF_API_BASE}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Hugging Face API error (${res.status}): ${text}`);
  }

  return res.json() as Promise<HfPlanResponse>;
}

/* ------------------------------------------------------------------ */
/*  Backend execution types                                             */
/* ------------------------------------------------------------------ */

/** Execution mode for the Vietjourney Agent Feature. */
export type ExecutionMode = 'DIRECT_ADD' | 'PROPOSAL';

/** Status of a single event execution. */
export type EventStatus = 'SUCCESS' | 'SKIPPED' | 'ERROR';

export type EventExecutionResult = {
  /** Index in the original timeline array. */
  index: number;
  status: EventStatus;
  /** Human-readable description of the event. */
  label: string;
  /** ID of the created event or proposal (if successful). */
  entityId?: string;
  /** Error message (if status === ERROR). */
  errorMessage?: string;
};

export type ExecutePlanResponse = {
  totalEvents: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  results: EventExecutionResult[];
};

export type ExecutePlanRequest = {
  /** Hugging Face timeline array. */
  timeline: HfTimelineEvent[];
  /** The trip timeline ID. */
  timelineId: string;
  /** Start date for time calculations (yyyy-MM-dd). */
  startDate: string;
  /** Execution mode. */
  mode: ExecutionMode;
};

/**
 * Send the Hugging Face plan to the Vietjourney backend for execution.
 * The backend will resolve place IDs, transform data, and add events/proposals.
 */
export async function executeAgentPlan(
  plan: ExecutePlanRequest,
  accessToken: string,
): Promise<ExecutePlanResponse> {
  return requestJson<ExecutePlanResponse>('/api/v1/agent/execute-plan', {
    method: 'POST',
    body: JSON.stringify({
      timeline: plan.timeline,
      timelineId: plan.timelineId,
      startDate: plan.startDate,
      mode: plan.mode,
    }),
    accessToken,
  });
}
