# Implementation Plan: Vietjourney Timeline Agent Feature

## 1. Introduction

This document outlines the implementation plan for a new "Agent Feature" within the Vietjourney platform. The goal is to enable an automated agent to interact with trip timelines as if it were a human member, specifically by adding and proposing timeline events. This will allow for programmatic generation or suggestion of itinerary items, enhancing collaborative planning workflows.

## 2. Agent Capabilities & Persona

This feature involves two distinct agent components:

1.  **Hugging Face Agent (The Planner):**
    *   **Role:** Acts as the natural language interface and planning engine.
    *   **Capabilities:** Receives user natural language requests (e.g., "Plan a 3-day trip to Hanoi"). It then generates a structured JSON plan, which is a list of proposed timeline events with place details, categories, and estimated times.
    *   **Output:** **Strictly JSON format**, conforming to the schema defined in section 3.0. It does **not** directly interact with the Vietjourney backend.
    *   **Note on `timeline_context`:** While providing current timeline context to the Hugging Face Agent would enable more intelligent planning (e.g., avoiding overlaps, using `baseVersion`), its current API does not support this. Therefore, the Vietjourney Agent Feature is solely responsible for obtaining timeline context, performing overlap validation, and managing `baseVersion` for proposals.

2.  **Vietjourney Agent Feature (The Executor):**
    *   **Role:** Acts as the backend integration layer, consuming the JSON plan from the Hugging Face agent and executing it against the Vietjourney APIs.
    *   **Capabilities:**
        *   **Consume JSON Plan:** Reads the structured JSON output from the Hugging Face agent.
        *   **Authenticate:** Interacts with the backend API using JWT authentication, impersonating a dedicated `User` account.
        *   **Create Timeline Events:** Directly adds new events to a timeline via `POST /api/v1/timelines/{timelineId}/events`.
        *   **Submit Timeline Proposals:** Proposes new events or changes to a timeline, requiring human approval, via `POST /api/v1/timelines/{timelineId}/proposals`.
        *   **Place Lookup:** Uses the `POST /api/v1/places/filter` endpoint to resolve `externalPlaceId` and other details for places provided by the Hugging Face agent (if not fully specified).
    *   **Interaction:** This component has an associated `User` account in the system and interacts with the backend API using JWT authentication, just like a regular user. It directly handles all API calls to Vietjourney backend.

### 3.0. Hugging Face Agent Output / Vietjourney Agent Feature Input (JSON Schema)

The Hugging Face Agent (`https://youmei295-planning-agent.hf.space`) is expected to generate a JSON response with a `timeline` array. The Vietjourney Agent Feature will consume this `timeline` array directly. Each object in the `timeline` array should conform to the following schema, matching the HF agent's output:

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "time": { "type": "string", "description": "Time range of the activity (e.g., '08:00 - 10:00')" },
      "activity": { "type": "string", "description": "Description of the activity (e.g., 'Uống cafe')" },
      "location": { "type": "string", "description": "Human-readable name of the place/event (e.g., 'Quán Cafe Yên')" },
      "location_id": { "type": "string", "nullable": true, "description": "Optional: ID of the place from the place catalog (e.g., 'uuid-from-supabase'). If not provided, the Vietjourney Agent Feature will perform a lookup using 'location' and 'activity' to infer category." },
      "cost_estimate": { "type": "string", "nullable": true, "description": "Optional: Estimated cost (e.g., '50000')" }
    },
    "required": ["time", "activity", "location"]
  }
}
```

---

## 3. Backend Integration Points

The agent will primarily interact with the existing Spring Boot backend API. The core interactions will leverage endpoints and Data Transfer Objects (DTOs) from the `timeline` module, and potentially the `place` module for looking up place details.

### 3.1. Creating Timeline Events Directly

To directly add a timeline event, the agent will need to call the existing `TimelineEventController` endpoint.

*   **API Endpoint:** `POST /api/v1/timelines/{timelineId}/events`
*   **Backend Controller:** `com.project.backend.modules.timeline.controller.TimelineEventController`
*   **Backend Service:** `com.project.backend.modules.timeline.service.TimelineEventService.createTimelineEvent()`
*   **Required Request Body JSON (based on `CreateTimelineEventRequest`):**

    ```json
    {
      "externalPlaceId": "string",  // ID of the place from the place catalog
      "category": "FOOD" | "DRINK" | "ACTIVITY", // Category of the place
      "startTime": "yyyy-MM-ddTHH:mm:ss", // ISO 8601 datetime for event start
      "endTime": "yyyy-MM-ddTHH:mm:ss",   // ISO 8601 datetime for event end
      "orderIndex": 0,                // Order index for events on the same day (integer)
      "notes": "string"               // Optional notes about the event
    }
    ```

    **Example:**
    ```json
    {
      "externalPlaceId": "place-abc-123",
      "category": "FOOD",
      "startTime": "2026-07-20T12:00:00",
      "endTime": "2026-07-20T14:00:00",
      "orderIndex": 1,
      "notes": "Lunch at a highly-rated local restaurant."
    }
    ```

### 3.2. Submitting Timeline Proposals

To propose a timeline event (requiring approval), the agent will interact with the `TimelineProposalController`. This is more complex as it involves specifying an `action` and `data` payload within the proposal.

*   **API Endpoint:** `POST /api/v1/timelines/{timelineId}/proposals`
*   **Backend Controller:** `com.project.backend.modules.timeline.controller.TimelineProposalController`
*   **Backend Service:** `com.project.backend.modules.timeline.proposal.TimelineProposalService.submitProposal()`
*   **Required Request Body JSON (based on `SubmitProposalRequest`):**

    ```json
    {
      "baseVersion": 0,                     // Current version of the timeline (for optimistic locking)
      "action": "ADD_EVENT" | "UPDATE_EVENT" | "DELETE_EVENT", // Type of change being proposed
      "data": {                             // Payload specific to the action
        // For ADD_EVENT, this would be similar to CreateTimelineEventRequest
        // For UPDATE_EVENT, it would be an object with fields to update and the event ID
        // For DELETE_EVENT, it would contain the event ID
      }
    }
    ```

    **Example for `ADD_EVENT` Proposal:**
    ```json
    {
      "baseVersion": 5,
      "action": "ADD_EVENT",
      "data": {
        "externalPlaceId": "place-xyz-456",
        "category": "ACTIVITY",
        "startTime": "2026-07-20T15:00:00",
        "endTime": "2026-07-20T17:00:00",
        "orderIndex": 2,
        "notes": "A proposed visit to a historical site."
      }
    }
    ```
    *(Note: The `data` field's schema depends on the `action` and would mirror the respective `TimelineEvent` DTOs for creation, update, or deletion.)*

## 4. Agent Authentication & Authorization

The agent will authenticate using a standard JWT flow:

1.  **Agent User Account:** A dedicated `User` account (`agent-user-01`, `ai-planner-bot`, etc.) will be created in the system. This account should have the `USER` role and potentially a custom `AGENT` role for specific permissions.
2.  **Login:** The agent will perform a `POST /api/v1/auth/login` using its username and password to obtain a JWT.
3.  **Bearer Token:** All subsequent API calls by the agent to timeline-related endpoints will include this JWT in the `Authorization: Bearer <token>` header.
4.  **Permissions:** The agent's associated roles and permissions will determine its ability to view, create, and propose timeline events (e.g., `hasAnyRole('USER', 'LEADER', 'ADMIN')` or more granular permissions on timeline events).

## 5. Agent's Required Output (JSON Schemas)

For the agent to effectively communicate with the backend API, it must be capable of generating JSON payloads that conform to the existing backend DTOs. This implies the agent's internal reasoning or tool-use capabilities must output structured JSON matching these schemas.

### 5.1. JSON Schema for Creating Direct Timeline Events

The agent's "tool output" for creating a direct event would need to match the `CreateTimelineEventRequest` schema:

```json
{
  "type": "object",
  "properties": {
    "externalPlaceId": { "type": "string", "description": "ID of the place from the place catalog" },
    "category": { "type": "string", "enum": ["FOOD", "DRINK", "ACTIVITY"], "description": "Category of the place" },
    "startTime": { "type": "string", "format": "date-time", "description": "ISO 8601 datetime for event start (e.g., 2026-07-20T12:00:00)" },
    "endTime": { "type": "string", "format": "date-time", "description": "ISO 8601 datetime for event end (e.g., 2026-07-20T14:00:00)" },
    "orderIndex": { "type": "integer", "description": "Order index for events on the same day, starting from 0" },
    "notes": { "type": "string", "nullable": true, "description": "Optional notes about the event" }
  },
  "required": ["externalPlaceId", "category", "startTime", "endTime", "orderIndex"]
}
```

### 5.2. JSON Schema for Submitting Timeline Proposals

The agent's "tool output" for submitting a proposal would need to match the `SubmitProposalRequest` schema, with a dynamic `data` field:

```json
{
  "type": "object",
  "properties": {
    "baseVersion": { "type": "integer", "description": "The current version of the timeline (for optimistic locking)" },
    "action": { "type": "string", "enum": ["ADD_EVENT", "UPDATE_EVENT", "DELETE_EVENT"], "description": "The type of change being proposed" },
    "data": {
      "type": "object",
      "description": "The payload for the proposed action, schema varies by 'action' type.",
      "oneOf": [
        {
          "if": { "properties": { "action": { "const": "ADD_EVENT" } } },
          "then": { "$ref": "#/definitions/CreateTimelineEventData" }
        },
        {
          "if": { "properties": { "action": { "const": "UPDATE_EVENT" } } },
          "then": { "$ref": "#/definitions/UpdateTimelineEventData" }
        },
        {
          "if": { "properties": { "action": { "const": "DELETE_EVENT" } } },
          "then": { "$ref": "#/definitions/DeleteTimelineEventData" }
        }
      ]
    }
  },
  "required": ["baseVersion", "action", "data"],
  "definitions": {
    "CreateTimelineEventData": {
      "type": "object",
      "properties": {
        "externalPlaceId": { "type": "string" },
        "category": { "type": "string", "enum": ["FOOD", "DRINK", "ACTIVITY"] },
        "startTime": { "type": "string", "format": "date-time" },
        "endTime": { "type": "string", "format": "date-time" },
        "orderIndex": { "type": "integer" },
        "notes": { "type": "string", "nullable": true }
      },
      "required": ["externalPlaceId", "category", "startTime", "endTime", "orderIndex"]
    },
    "UpdateTimelineEventData": {
      "type": "object",
      "properties": {
        "id": { "type": "string" }, // ID of the event to update
        "externalPlaceId": { "type": "string", "nullable": true },
        "category": { "type": "string", "enum": ["FOOD", "DRINK", "ACTIVITY"], "nullable": true },
        "startTime": { "type": "string", "format": "date-time", "nullable": true },
        "endTime": { "type": "string", "format": "date-time", "nullable": true },
        "orderIndex": { "type": "integer", "nullable": true },
        "notes": { "type": "string", "nullable": true }
      },
      "required": ["id"]
    },
    "DeleteTimelineEventData": {
      "type": "object",
      "properties": {
        "id": { "type": "string" } // ID of the event to delete
      },
      "required": ["id"]
    }
  }
}
```

## 6. High-Level Vietjourney Agent Feature Workflow

The Vietjourney Agent Feature, upon receiving a JSON plan from the Hugging Face Agent, will follow these steps to execute the plan:

1.  **Receive JSON Plan:** Consume the structured JSON array of proposed timeline events (conforming to the schema in section 3.0).
2.  **Authenticate:** Obtain or refresh a JWT for API calls using the dedicated agent user account.
3.  **Resolve Place Details:** For each proposed event in the JSON plan:
    *   If `location_id` is provided and is a valid UUID, use it directly as `externalPlaceId`.
    *   If `location_id` is `null`, missing, or a non-UUID placeholder/search term, use the `location` (and inferred `category` from `activity`) to call the `POST /api/v1/places/filter` endpoint to find the `externalPlaceId`. Handle cases where a place cannot be found or multiple matches exist (e.g., log a warning, skip the event, or use the first reasonable result).
4.  **Retrieve Timeline Context:** Fetch the target timeline's current details (`GET /api/v1/timelines/{timelineId}`) to obtain the `baseVersion` required for submitting proposals and to validate event placement.
5.  **Process Each Event (Direct Add or Proposal):** For each resolved event:
    *   **Determine Execution Strategy:** Based on configuration or a flag, decide whether to directly add the event or submit it as a proposal.
        *   **Data Transformation:** Convert the Hugging Face agent's event format into a `CreateTimelineEventRequest` payload:
            *   **`startTime`/`endTime`:** Combine the overall plan's `start_date` (from the initial user request to the HF agent) with the event's `time` string (e.g., "08:00 - 10:00") to form `LocalDateTime` objects.
            *   **`category`:** Infer from the `activity` field (e.g., "Uống cafe" -> `DRINK` or `FOOD`, "Tham quan" -> `ACTIVITY`).
            *   **`orderIndex`:** Assign sequentially for events on the same day, ordered by `startTime`.
            *   **`notes`:** Use the `activity` and/or `location` fields.
        *   **Direct Add:** Construct the transformed `CreateTimelineEventRequest` payload and make a `POST` request to `BACKEND_BASE_URL/api/v1/timelines/{timelineId}/events`.
        *   **Submit Proposal:** Construct a `SubmitProposalRequest` payload (setting `changeType` to `ADD_EVENT` and `data` to the transformed `CreateTimelineEventRequest` structure), and make a `POST` request to `BACKEND_BASE_URL/api/v1/timelines/{timelineId}/proposals`.
    *   **Adhere to Schemas:** Ensure all generated JSON payloads strictly conform to the `CreateTimelineEventRequest` and `SubmitProposalRequest` schemas.
    *   **Include JWT:** All requests must include the valid JWT in the `Authorization: Bearer <token>` header.
6.  **Process Responses & Report:**
    *   Handle successful API responses (e.g., log successful event creation/proposal submission).
    *   Manage error responses (e.g., `400 Bad Request` for validation issues, `403 Forbidden` for permissions). Log errors clearly and potentially report back to an orchestrating system or user.
7.  **Generate Summary Report:** After processing all events in the plan, generate a summary of successful additions/proposals and any errors encountered.


## 7. Frontend UI: Agent Interaction Panel

This section covers the user-facing frontend integration for the Agent Feature.

### 7.1. Integration Point

The agent UI will be implemented as a dedicated **`AgentPanel` component** integrated into the **`Planner` page** (`frontend/src/app/pages/Planner.tsx`). This is the natural home for agent interaction, as the `Planner` is already the central trip planning workspace and already houses the `ChatPanel` component for real-time group chat.

### 7.2. New Component: `AgentPanel.tsx`

A new React component will be created at `frontend/src/app/components/AgentPanel.tsx`. It will serve as the dedicated chat interface for the agent, separate from the group chat `ChatPanel`.

### 7.3. User Interaction Flow

#### Phase A — Planning Request

1.  **Entry Point:** A new button (e.g., "AI Planner" with a `Bot` or `Wand` icon from `lucide-react`) is added to the `Planner` page header, next to the existing "Trò chuyện" chat button.
2.  **Toggle Panel:** Clicking the button opens the `AgentPanel` as a side panel or slide-over (using Radix UI `Sheet` or `Dialog`, reusing the same pattern as `ChatPanel`).
3.  **User Input:** The panel provides a multi-line text input field where the user types natural language planning requests, for example:
    - *"Lên kế hoạch một ngày ở Quận 1, ghé quán cafe và ăn tối"*
    - *"Gợi ý thêm điểm tham quan cho buổi chiều ngày mai"*
    - *"Tìm quán ăn ngon gần đây cho bữa trưa"*
4.  **Optional Controls:** Start-date and duration selectors may be included for explicit input.
5.  **Send to Hugging Face Agent:** Upon submission, the `AgentPanel` calls the Hugging Face API (`POST https://youmei295-planning-agent.hf.space/api/plan`) with the user's `message`, `start_date`, `num_days`, and `session_id`.
6.  **Loading State:** A loading indicator (e.g., spinner + "AI đang lên kế hoạch...") is shown while waiting for the Hugging Face agent's response.

#### Phase B — Display Hugging Face Output

1.  **Chat-type Response (`status: "chat"`):** If the agent needs clarification, its `itinerary_markdown` is displayed as a chat bubble so the user can respond.
2.  **Successful Plan (`status: "success"`):** The `AgentPanel` renders:
    - The `itinerary_markdown` in a readable Markdown block.
    - A visual **timeline preview** — a structured list of proposed events with time, activity, location, and cost estimate, styled similarly to the existing timeline event cards in the `Planner`.
    - The total cost estimate from the `total_cost` field.
3.  **Error State:** If the Hugging Face API returns an error, a clear error message (in Vietnamese) is displayed with a retry option.

#### Phase C — Execution via Vietjourney Agent Feature

1.  **Action Buttons:** After a successful plan is displayed, two action buttons appear at the bottom of the panel:
    - **"Thêm vào lịch trình"** (Add to Timeline) — Directly adds all events to the timeline via the Vietjourney Agent Feature.
    - **"Đề xuất cho nhóm"** (Propose to Group) — Submits the plan as proposals requiring group approval.
2.  **Execution Flow:** When clicked, the button sends the `timeline` array (along with `timelineId` and `start_date`) to the Vietjourney Agent Feature (backend executor).
3.  **Progress Indicator:** During execution, the panel shows a progress list (e.g., "Đang thêm sự kiện 1/3...") so the user can see which events are being processed.
4.  **Result Feedback:** After execution completes, the panel displays:
    - Green checkmarks for successfully added/proposed events.
    - Red warnings for failures (e.g., overlapping events, place not found) with reasons in Vietnamese.

### 7.4. Key UI States Summary

The `AgentPanel` component must handle the following states:

| State | Condition | UI |
|-------|-----------|-----|
| Idle | Panel opened, no action yet | Welcome message + input field |
| Loading (HF agent) | Waiting for Hugging Face API | Spinner + "AI đang lên kế hoạch..." |
| Chat response | `status: "chat"` | Agent's message as chat bubble, input re-enabled |
| Plan display | `status: "success"` | Markdown itinerary + timeline preview + action buttons |
| Error (HF) | Hugging Face API error | Error message + retry button |
| Executing | Calling Vietjourney Agent Feature | Progress list per event |
| Success | Events added/proposed successfully | Summary with green checkmarks |
| Partial failure | Some events failed | Mixed results: green checkmarks + red warnings |

### 7.5. Integration with Existing Components

- **`useAuth()`**: The `AgentPanel` will use the auth context to retrieve the user's `token` and `timelineId`.
- **`Planner` page state**: The `start_date` and `tripId` (which is the `timelineId`) are already available in the `Planner` component's state and will be passed as props to `AgentPanel`.
- **WebSocket (`useTimelineSocket`)**: After successful direct addition of events, the WebSocket connection will automatically broadcast `EVENT_ADDED` events to all connected clients, so the timeline UI updates in real-time without manual refresh.

---

## 8. Future Considerations/Enhancements

*   **Agent Roles & Permissions:** Implement more granular roles for agents (e.g., a "suggestion-only" agent vs. a "direct-action" agent) to control their capabilities.
*   **Conflict Resolution:** Implement logic for the agent to detect and potentially resolve conflicts (e.g., if a timeline event overlaps with an existing one when trying to add directly).
*   **Natural Language to JSON Mapping:** Develop a robust mechanism within the agent to translate natural language requests into the structured JSON formats required by the API.
*   **Feedback Loop:** Allow the agent to interpret responses from the backend (e.g., validation errors) and provide informative feedback to the user or retry with corrections.
*   **Event Updates/Deletions:** Extend the agent's capabilities to update or delete existing timeline events through proposals or direct actions.

---

## 9. Implementation Record

### v1.0 — 2026-06-16 (Initial implementation)

**Backend — New Agent Module (`backend/src/main/java/com/project/backend/modules/agent/`)**

| File | Purpose |
|------|---------|
| `controller/AgentController.java` | `POST /api/v1/agent/execute-plan` — accepts JSON plan + timeline context, requires `canEditTimeline` permission |
| `dto/request/ExecutePlanRequest.java` | Request payload with `timeline[]`, `timelineId`, `startDate`, `mode` |
| `dto/request/ProposedEvent.java` | Maps HF agent's timeline event format (time, activity, location, location_id, cost_estimate) |
| `dto/request/ExecutionMode.java` | Enum: `DIRECT_ADD` / `PROPOSAL` |
| `dto/response/EventExecutionResult.java` | Per-event result (status, label, entityId, errorMessage) |
| `dto/response/EventStatus.java` | Enum: `SUCCESS` / `SKIPPED` / `ERROR` |
| `dto/response/ExecutePlanResponse.java` | Summary with counts + per-event results |
| `service/AgentExecutionService.java` | Core executor — resolves places, infers category, parses times, delegates to TimelineEventService/TimelineProposalService |

**Key Design Decisions:**

1. **User's authority, not bot account.** The controller requires the requesting user's JWT and checks `canEditTimeline` via `@PreAuthorize`. All downstream calls run under that user's Spring Security context.
2. **Place name resolution.** If `location_id` is a valid UUID, it is used directly. Otherwise `PlaceService.filterPlaces()` is queried with the inferred category and results are matched by name (case-insensitive contains).
3. **Category inference by activity keywords.** `AgentExecutionService.inferCategory()` uses a keyword-driven rule set (DRINK keywords checked first, then FOOD, fallback ACTIVITY).
4. **Time string parsing.** `AgentExecutionService.parseTimeRange()` converts `"HH:mm - HH:mm"` → `LocalDateTime` on the given `startDate`. Falls back to 9 AM + 2h blocks if parsing fails.
5. **Proposal `baseVersion`.** Derived from the max `version` across existing timeline events (or 0 if none).

**Frontend — New Files & Modifications**

| File | Purpose |
|------|---------|
| `frontend/src/app/lib/agentApi.ts` | API client: `callHuggingFaceAgent()` calls HF API, `executeAgentPlan()` calls backend |
| `frontend/src/app/components/AgentPanel.tsx` | Full UI component with 8 states (idle, planning, chat_response, plan_display, hf_error, executing, execution_result) |
| `frontend/src/app/pages/Planner.tsx` | Added "AI Planner" button + `AgentPanel` rendering |

**Frontend UI States (from plan §7.4):**
- ✅ **Idle** — Welcome message, suggestion buttons, text input
- ✅ **Planning** — Animated loading with pulsing icon
- ✅ **Chat response** — Agent's message rendered as chat bubble, input re-enabled
- ✅ **Plan display** — Markdown itinerary, event cards with time/activity/location/cost, action buttons
- ✅ **Error (HF)** — Error message + retry + reset buttons
- ✅ **Executing** — Per-event progress with status icons (pending → success/error/skipped)
- ✅ **Success** — Summary card with green checkmarks, close button
- ✅ **Partial failure** — Mixed results with success count, skip/error lists

**Cross-references:**
- HF agent API: `d:\Study\HuggingFace\planning-agent\API_DOCS.md`
- Memory: [[agent-feature-2026-06-16]]
