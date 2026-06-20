const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
import { getAuthToken } from "./authApi";
import type { Place } from "./placesApi";

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export type RecommendationEventType = "VIEWPORT" | "CLICK" | "DWELL" | "ADD_TO_TIMELINE";

interface PlaceInteractionInput {
  place: Place;
  eventType: RecommendationEventType;
}

function authHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchRecommendedPlaces(size = 12, signal?: AbortSignal) {
  const response = await fetch(_getApiBase() + `/api/v1/recommendations/places?size=${size}`, {
    method: "GET",
    signal,
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Không tải được gợi ý (${response.status})`);
  }

  const payload = (await response.json()) as ApiResponse<Place[]>;
  return payload.result;
}

export async function recordPlaceInteraction({ place, eventType }: PlaceInteractionInput) {
  const response = await fetch(_getApiBase() + "/api/v1/recommendations/interactions", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      placeId: place.id,
      category: String(place.category || "").toLowerCase(),
      eventType,
      district: place.district || undefined,
      tags: place.tags || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Không ghi nhận được tương tác (${response.status})`);
  }
}
