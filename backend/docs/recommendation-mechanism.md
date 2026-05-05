# Recommendation Mechanism (Functional Design)

## Goal
Provide personalized place suggestions based on user behavior over time.

The mechanism starts from neutral recommendations and becomes personalized as interaction data grows.

## High-Level Flow
1. User performs actions on places in UI.
2. Frontend sends interaction events to backend.
3. Backend updates user preference profile using weighted events.
4. Recommendation endpoint scores candidate places against that profile.
5. Backend returns top results ordered by final score.

## Behavior Signals and Weights
Each event contributes a score:

- `VIEWPORT`: +1  
  Meaning: place stays in main viewport for enough time (frontend decides threshold).

- `CLICK`: +2  
  Meaning: user intentionally opens/selects place.

- `DWELL`: +4  
  Meaning: user spends meaningful time in place detail view.

- `ADD_TO_TIMELINE`: +6  
  Meaning: strongest intent, user adds place into schedule.

If request provides explicit `score`, backend uses it (capped). Otherwise backend uses default score above.

## User Profile Dimensions
Profile is maintained by user and split into three weighted dimensions:

1. Tag preferences  
   Example: `vibe:cozy`, `purpose:date`, `amenity:wifi`

2. District preferences  
   Example: `district 1`, `district 3`

3. Category preferences  
   Example: `food`, `drink`, `activity`

Every interaction updates all available dimensions from the interacted place.

## Where Profile Data Is Stored
Profile is persisted in database tables (not in token/session):

- `user_tag_preferences`
- `user_district_preferences`
- `user_category_preferences`
- `user_place_interactions` (event history)

Because it is DB-persisted by `user_id`, profile remains after logout/login.

## Time Decay
To avoid stale behavior dominating forever, scores decay with time.

Current model:
- Daily decay factor: `0.98`
- Formula: `effective_score = stored_score * (0.98 ^ days_since_update)`

Decay is applied when:
1. Reading profile for recommendation scoring.
2. Returning `/profile/me`.
3. Updating an existing preference with a new interaction (score is decayed first, then new score is added).

Effect:
- Recent behavior has stronger impact.
- Old behavior naturally fades without hard deletion.

## Candidate Selection and Scoring
Recommendation does two stages:

1. Candidate retrieval
- Backend fetches a candidate pool from place sources.
- Pool size is larger than response size (`size`) but bounded.
- Candidate query is prefiltered by top user categories and districts to reduce latency.

2. Final ranking
- Each candidate receives a score from profile match.
- Weighted combination:
  - Tag score: `55%`
  - District score: `25%`
  - Category score: `10%`
  - Place rating score: `10%`

Final list is sorted descending by total score and truncated to requested `size`.

Important:
- Reducing candidate pool does **not** reduce response size.
- If `size=20`, backend still returns up to 20 items.

## Cold Start Behavior
When user has no profile:
- Backend returns random recommendations (bounded by requested size).
- As interactions are recorded, system transitions to personalized ranking.

## Batch Event Strategy
Batch ingestion is preferred for frontend:
- Lower network overhead.
- Better throughput under frequent events.
- More stable user experience under high interaction volume.

Recommended client behavior:
1. Queue events locally.
2. Send batch every few seconds or when queue threshold is reached.
3. Flush pending events before page unload/navigation.

## Observability
Recommendation endpoint logs internal timing at debug level:
- Profile load time
- Candidate query time
- Scoring/sorting time
- Total request time

This helps identify whether bottleneck is data fetch, scoring, or both.

## Non-Goals in Current Version
- No global cache layer included here.
