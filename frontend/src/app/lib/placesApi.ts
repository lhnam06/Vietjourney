import { requestJson } from './api';
import type { RecommendedPlace } from './recommendationApi';

/** Matches backend `PlaceResponse` fields used by Discovery. */
export type PlaceResponse = RecommendedPlace;

export type PlaceFilterRequest = {
  category?: string;
  district?: string;
  tags?: Record<string, string[]>;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  page?: number;
  size?: number;
};

export type PageResponse<T> = {
  data: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
};

/**
 * Public endpoint — no Bearer token required.
 * Backend must expose `places_food` / `places_drink` / `places_activity` (or subsets) on the primary DB.
 */
export async function filterPlaces(
  body: PlaceFilterRequest
): Promise<PageResponse<PlaceResponse>> {
  return requestJson<PageResponse<PlaceResponse>>('/api/v1/places/filter', {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}
