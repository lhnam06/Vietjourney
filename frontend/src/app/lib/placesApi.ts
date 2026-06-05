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

function placeRowKey(row: PlaceResponse): string {
  const rawId = typeof row.id === 'string' ? row.id.trim() : '';
  if (rawId) return `${row.category ?? 'place'}:${rawId}`;
  const category = (row.category ?? 'place').trim().toLowerCase();
  const name = (row.name ?? '').trim().toLowerCase();
  const address = (row.address ?? '').trim().toLowerCase();
  const lat = Number.isFinite(row.latitude as number) ? Number(row.latitude).toFixed(5) : 'na';
  const lng = Number.isFinite(row.longitude as number) ? Number(row.longitude).toFixed(5) : 'na';
  return `${category}:${name}:${address}:${lat}:${lng}`;
}

/** Fetch every page; first page resolves immediately via `onFirstPage` for progressive UI. */
export async function fetchAllPlacePages(
  buildBody: (page: number) => PlaceFilterRequest,
  options?: {
    onFirstPage?: (rows: PlaceResponse[], totalPages: number) => void;
    isCancelled?: () => boolean;
  }
): Promise<PlaceResponse[]> {
  const firstPage = await filterPlaces(buildBody(0));
  if (options?.isCancelled?.()) return firstPage.data ?? [];

  const rows = [...(firstPage.data ?? [])];
  const totalPages = Math.max(1, firstPage.totalPages ?? 1);
  options?.onFirstPage?.(rows, totalPages);

  if (totalPages <= 1) {
    return Array.from(new Map(rows.map((row) => [placeRowKey(row), row])).values());
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => filterPlaces(buildBody(index + 1)))
  );
  if (options?.isCancelled?.()) return rows;

  for (const page of remainingPages) {
    rows.push(...(page.data ?? []));
  }

  return Array.from(new Map(rows.map((row) => [placeRowKey(row), row])).values());
}
