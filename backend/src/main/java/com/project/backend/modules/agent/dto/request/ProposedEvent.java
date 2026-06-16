package com.project.backend.modules.agent.dto.request;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * A single proposed event from the Hugging Face agent's timeline output.
 *
 * Maps directly to the HF agent's JSON schema:
 * <pre>
 * {
 *   "time": "08:00 - 10:00",
 *   "activity": "Uống cafe",
 *   "location": "Quán Cafe Yên",
 *   "location_id": "uuid-from-supabase" | null,
 *   "cost_estimate": "50000" | null
 * }
 * </pre>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ProposedEvent {
    /** Time range string, e.g. "08:00 - 10:00". */
    String time;

    /** Activity description, e.g. "Uống cafe". */
    String activity;

    /** Human-readable location name, e.g. "Quán Cafe Yên". */
    String location;

    /** Optional place catalog UUID from Supabase. */
    String locationId;

    /** Optional cost estimate string, e.g. "50000". */
    String costEstimate;
}
