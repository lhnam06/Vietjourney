import type { Location } from '../data/mockData';
import type { PlaceInteractionPayload, RecommendedPlace } from './recommendationApi';
import type { PlaceResponse } from './placesApi';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1544984243-ec57ea16fe25?w=800&q=80';

/** Map default center — TP. Hồ Chí Minh (Quận 1 vicinity). */
export const HCMC_CENTER: [number, number] = [10.7769, 106.7009];

const DEFAULT_FALLBACK_DISTRICT = 'Thành phố Hồ Chí Minh';

export function isInHCMCMetro(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null) return false;
  return lat >= 10.45 && lat <= 11.05 && lng >= 106.48 && lng <= 106.92;
}

/** Prefer rows inside HCMC metro; if none match coords, keep full list (e.g. national catalog). */
export function preferHoChiMinhCatalog<T extends { lat: number; lng: number }>(rows: T[]): T[] {
  const inMetro = rows.filter((r) => isInHCMCMetro(r.lat, r.lng));
  return inMetro.length > 0 ? inMetro : rows;
}

function flattenTags(tags?: Record<string, string[]> | null): string[] {
  if (!tags) return [];
  return Object.values(tags)
    .flat()
    .map((t) => t.trim())
    .filter(Boolean);
}

function budgetFromPrice(max?: number | null, min?: number | null): Location['budget'] {
  const p = max ?? min ?? 0;
  if (p <= 0) return '$';
  if (p <= 100_000) return '$';
  if (p <= 350_000) return '$$';
  return '$$$';
}

/** Map UI mock / legacy location to a valid backend category. */
export function inferCategoryFromLocation(location: Location): string {
  if (location.recommendation?.category) return location.recommendation.category;
  const text = `${location.name} ${location.tags.join(' ')}`.toLowerCase();
  if (/(cà phê|coffee|bar|pub|bia|trà|tra sua|trà sữa|drink|cocktail|wine)/.test(text)) {
    return 'drink';
  }
  if (/(tham quan|bảo tàng|bao tang|đền|chùa|di tích|nhà thờ|\bdinh\b|trek|leo núi|công viên|walking tour|show|nhạc sống)/.test(text)) {
    return 'activity';
  }
  return 'food';
}

export function buildInteractionBase(location: Location): Omit<PlaceInteractionPayload, 'eventType'> {
  const rec = location.recommendation;
  const category = rec?.category ?? inferCategoryFromLocation(location);
  const district = rec?.district ?? DEFAULT_FALLBACK_DISTRICT;
  const tags = rec?.tags ?? { purpose: location.tags };
  return {
    placeId: location.id,
    category,
    district,
    tags,
  };
}

export function recommendedPlaceToLocation(p: RecommendedPlace): Location {
  const tagList = flattenTags(p.tags);
  const lat = p.latitude ?? HCMC_CENTER[0];
  const lng = p.longitude ?? HCMC_CENTER[1];
  return {
    id: p.id,
    name: p.name,
    description: p.address?.trim() ? p.address : 'Địa điểm được đề xuất',
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
    lat,
    lng,
    price: p.maxPrice ?? p.minPrice ?? 0,
    rating: p.rating ?? 0,
    tags: tagList.length ? tagList : [p.category],
    weather: 'both',
    vibe: 'moderate',
    budget: budgetFromPrice(p.maxPrice, p.minPrice),
    duration: 90,
    recommendation: {
      category: p.category,
      district: p.district,
      tags: p.tags,
    },
  };
}

/** Map `POST /api/v1/places/filter` rows to Discovery `Location` (same payload shape as recommendations). */
export function placeApiRowToLocation(p: PlaceResponse): Location {
  return recommendedPlaceToLocation(p);
}
