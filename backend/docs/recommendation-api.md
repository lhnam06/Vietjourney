# Recommendation API (Frontend Integration Guide)

## Base Path
All endpoints are under:

`/api/v1/recommendations`

## Authentication
All endpoints require a Bearer token with role `USER`.

Header:

`Authorization: Bearer <jwt-token>`

## Endpoints

### 1) Record Single Interaction
`POST /api/v1/recommendations/interactions`

Purpose:
- Record one user behavior event for one place.
- Update user preference weights (tags, district, category).

Request body:

```json
{
  "placeId": "place-123",
  "category": "food",
  "eventType": "CLICK",
  "score": 2,
  "district": "District 1",
  "tags": {
    "vibe": ["cozy"],
    "purpose": ["date"]
  }
}
```

Notes:
- `score` is optional.
- If `score` is missing, backend uses default score from `eventType`.
- `district` and `tags` are optional fallback data when place lookup is not available.

Response:

```json
{
  "code": 1000,
  "message": null,
  "result": {
    "recorded": 1
  }
}
```

### 2) Record Batch Interactions
`POST /api/v1/recommendations/interactions/batch`

Purpose:
- Send multiple interaction events in one request.
- Recommended for scroll sessions, high-volume UI events, and reduced network overhead.

Request body:

```json
{
  "interactions": [
    {
      "placeId": "place-001",
      "category": "food",
      "eventType": "VIEWPORT"
    },
    {
      "placeId": "place-001",
      "category": "food",
      "eventType": "DWELL"
    },
    {
      "placeId": "place-002",
      "category": "drink",
      "eventType": "ADD_TO_TIMELINE"
    }
  ]
}
```

Response:

```json
{
  "code": 1000,
  "message": null,
  "result": {
    "recorded": 3
  }
}
```

Batch strategy recommendation:
1. Collect events in memory on the client.
2. Flush every 2-5 seconds, or when queue size reaches 20-50 events.
3. Flush immediately on page unload/route change.
4. Deduplicate noisy events if needed (example: repeated `VIEWPORT` for same place in a very short interval).

### 3) Get Recommended Places
`GET /api/v1/recommendations/places?size=20`

Purpose:
- Return personalized place recommendations for current user.

Query params:
- `size` optional, default `20`, max `50`.

Response sample:

```json
{
  "code": 1000,
  "message": null,
  "result": [
    {
      "id": "place-111",
      "name": "Cafe A",
      "address": "123 Street",
      "category": "food",
      "district": "district 1",
      "images": ["https://..."],
      "tags": {
        "vibe": ["cozy"],
        "purpose": ["date"]
      },
      "rating": 4.5,
      "minPrice": 50000,
      "maxPrice": 120000,
      "latitude": 10.77,
      "longitude": 106.69,
      "debug": {
        "totalScore": 85.4,
        "tagScore": 90.0,
        "districtScore": 80.0,
        "categoryScore": 100.0,
        "ratingScore": 90.0,
        "matchedTags": {
          "vibe:cozy": 12.4
        }
      }
    }
  ]
}
```

### 4) Get User Recommendation Profile
`GET /api/v1/recommendations/profile/me`

Purpose:
- Return current weighted profile for the logged-in user.
- Includes decayed scores.

Response sample:

```json
{
  "code": 1000,
  "message": null,
  "result": {
    "tags": [
      { "tagGroup": "vibe", "tagValue": "cozy", "score": 18.2 }
    ],
    "districts": [
      { "value": "district 1", "score": 9.7 }
    ],
    "categories": [
      { "value": "food", "score": 14.1 }
    ]
  }
}
```

## Interaction Event Enum
`eventType` supports:

- `VIEWPORT` (default score `+1`)
- `CLICK` (default score `+2`)
- `DWELL` (default score `+4`)
- `ADD_TO_TIMELINE` (default score `+6`)

## Data Requirements from Frontend
Minimal required fields per interaction:
- `placeId`
- `category` (`food`, `drink`, `activity`)
- `eventType`

Recommended fields:
- `district`
- `tags`

These help backend update profile even when place lookup source is unavailable.

## Error Notes
- Invalid category returns app error code `4004`.
- Invalid/missing token returns unauthorized.
- If place is not found and fallback `district/tags` is missing, backend can return place-not-exist error.
