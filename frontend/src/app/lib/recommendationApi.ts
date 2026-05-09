import { requestJson } from './api';

const BASE = '/api/v1/recommendations';

export type RecommendationEventType = 'VIEWPORT' | 'CLICK' | 'DWELL' | 'ADD_TO_TIMELINE';

export type PlaceInteractionPayload = {
  placeId: string;
  category: string;
  eventType: RecommendationEventType;
  score?: number;
  district?: string;
  tags?: Record<string, string[]>;
};

export type RecommendedPlace = {
  id: string;
  name: string;
  address?: string;
  category: string;
  district?: string;
  images?: string[];
  tags?: Record<string, string[]>;
  rating?: number;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
};

export type UserRecommendationProfile = {
  tags: { tagGroup: string; tagValue: string; score: number }[];
  districts: { value: string; score: number }[];
  categories: { value: string; score: number }[];
};

export async function getRecommendedPlaces(accessToken: string, size = 20): Promise<RecommendedPlace[]> {
  const q = new URLSearchParams({ size: String(Math.min(50, Math.max(1, size))) });
  return requestJson<RecommendedPlace[]>(`${BASE}/places?${q.toString()}`, {
    method: 'GET',
    accessToken,
  });
}

export async function getMyRecommendationProfile(accessToken: string): Promise<UserRecommendationProfile> {
  return requestJson<UserRecommendationProfile>(`${BASE}/profile/me`, {
    method: 'GET',
    accessToken,
  });
}

export async function postInteractionBatch(
  accessToken: string,
  interactions: PlaceInteractionPayload[]
): Promise<{ recorded: number }> {
  return requestJson<{ recorded: number }>(`${BASE}/interactions/batch`, {
    method: 'POST',
    accessToken,
    body: JSON.stringify({ interactions }),
  });
}
