const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
import { getAuthToken } from "./authApi";

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type HfTimelineEvent = {
  time: string;
  activity: string;
  location: string;
  location_id?: string | null;
  cost_estimate?: string | null;
};

export type HfPlanResponse =
  | { status: "chat"; total_cost: string; itinerary_markdown: string; timeline: [] }
  | { status: "success"; total_cost: string; itinerary_markdown: string; timeline: HfTimelineEvent[] };

export type ExecutionMode = "DIRECT_ADD" | "PROPOSAL";

export type EventStatus = "SUCCESS" | "SKIPPED" | "ERROR";

export type EventExecutionResult = {
  index: number;
  status: EventStatus;
  label: string;
  entityId?: string;
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
  timeline: HfTimelineEvent[];
  timelineId: string;
  startDate: string;
  mode: ExecutionMode;
};

const HF_API_BASE = "https://youmei295-planning-agent.hf.space";

async function parseApiResponse<T>(response: Response) {
  let payload: ApiResponse<T> | null = null;

  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Yêu cầu thất bại (${response.status})`);
  }

  if (!payload) {
    throw new Error("Backend không trả về dữ liệu hợp lệ.");
  }

  return payload.result;
}

export async function callHuggingFaceAgent(
  message: string,
  startDate?: string | null,
  numDays?: number | null,
  sessionId?: string | null,
) {
  const body: Record<string, unknown> = { message };
  if (startDate) body.start_date = startDate;
  if (numDays != null) body.num_days = numDays;
  if (sessionId) body.session_id = sessionId;

  const response = await fetch(`${HF_API_BASE}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Không thể kết nối AI Planner (${response.status})`);
  }

  return response.json() as Promise<HfPlanResponse>;
}

export async function executeAgentPlan(plan: ExecutePlanRequest) {
  const token = getAuthToken();
  const headers = new Headers({ "Content-Type": "application/json" });

  if (token) {
    headers.set("Authorization", `Bearer ${token.replace(/^Bearer\s+/i, "")}`);
  }

  const response = await fetch(_getApiBase() + "/api/v1/agent/execute-plan", {
    method: "POST",
    headers,
    body: JSON.stringify(plan),
  });

  return parseApiResponse<ExecutePlanResponse>(response);
}
