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
  const response = await fetch(`/api/v1/recommendations/places?size=${size}`, {
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
  const response = await fetch("/api/v1/recommendations/interactions", {
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
