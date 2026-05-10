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

function stablePlaceId(p: RecommendedPlace): string {
  const rawId = typeof p.id === 'string' ? p.id.trim() : '';
  if (rawId) return rawId;
  const name = (p.name ?? 'unknown').trim().toLowerCase().replace(/\s+/g, '-');
  const category = (p.category ?? 'place').trim().toLowerCase();
  const lat = Number.isFinite(p.latitude as number) ? Number(p.latitude).toFixed(5) : 'na';
  const lng = Number.isFinite(p.longitude as number) ? Number(p.longitude).toFixed(5) : 'na';
  return `${category}:${name}:${lat}:${lng}`;
}

function budgetFromPrice(max?: number | null, min?: number | null): Location['budget'] {
  const p = max ?? min ?? 0;
  if (p <= 0) return '$';
  if (p <= 100_000) return '$';
  if (p <= 350_000) return '$$';
  return '$$$';
}

/** Derive Discovery filters from structured tag JSON returned by the API (no backend changes). */
const TAG_GROUPS_FOR_HAYSTACK = new Set(['sub_category', 'purpose', 'service_style', 'vibe', 'amenity']);

function inferWeatherFromTags(tags?: Record<string, string[]> | null): Location['weather'] {
  if (!tags) return 'both';

  const blob = [...(tags.amenity ?? []), ...(tags.purpose ?? []), ...(tags.service_style ?? []), ...(tags.sub_category ?? [])]
    .join(' ')
    .toLowerCase();

  const outdoor = /\b(rooftop|alfresco|courtyard|garden|patio|terrace|beach(?:side)?|outdoor|open-?air|beer garden|ngoài trời|sân thượng|ban công|vườn|bia hơi)\b/.test(blob);
  const indoor = /\b(indoor|enclosed|climate controlled|\bmall\b|trong nhà|\bđiều hòa|máy lạnh)\b/.test(blob);

  if (indoor && outdoor) return 'both';
  if (outdoor) return 'outdoor';
  if (indoor) return 'indoor';
  return 'both';
}

function inferVibeFromTags(tags?: Record<string, string[]> | null): Location['vibe'] {
  if (!tags) return 'moderate';

  const direct = [...(tags.vibe ?? [])].map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const s of direct) {
    if (/(moderate|balanced|neutral|mixed|phổ\s*biến|cân\s*bằng)/.test(s)) return 'moderate';
    if (/(quiet|calm|cozy|serene|yên\s*tĩnh|thư giãn|thiền|nhẹ\s*nhàng)/.test(s)) return 'quiet';
    if (/(vibrant|lively|energetic|busy|noisy|night|karaoke|\bdj\b|sôi\s*động|ốn\s*ào)/.test(s)) return 'vibrant';
  }

  const haystack = Object.entries(tags)
    .flatMap(([k, vs]) => (TAG_GROUPS_FOR_HAYSTACK.has(k) ? vs : []))
    .join(' ')
    .toLowerCase();

  if (!haystack.trim()) return 'moderate';

  const quietHints = /\b(quiet|calm|peaceful|serene|intimate|\bcozy\b|study cafe|yên tĩnh|thiền|nhẹ nhàng|reading room|book\s*cafe)\b/i.test(haystack);
  const vibrantHints =
    /\b(vibrant|lively|bustling|energetic|nightlife|\bclub\b|\bdj\b|karaoke|crowded|\bbar\b hop|đêm\s*muộn|sôi động|ồn ào|náo nhiệt|live\s+music|pub crawl)\b/i.test(haystack);

  if (quietHints && vibrantHints) return 'moderate';
  if (quietHints) return 'quiet';
  if (vibrantHints) return 'vibrant';
  return 'moderate';
}

/** Plain-text slice for Discovery search bar (flattened labels + grouped tags). */
export function locationSearchText(location: Location): string {
  const parts: string[] = [location.name, location.description];
  parts.push(...location.tags);
  const grouped = location.recommendation?.tags;
  if (grouped) {
    for (const [k, vs] of Object.entries(grouped)) {
      parts.push(k, ...vs);
    }
  }
  return parts.join(' ').trim().toLowerCase();
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
    id: stablePlaceId(p),
    name: p.name,
    description: p.address?.trim() ? p.address : 'Địa điểm được đề xuất',
    image: p.images?.[0] ?? PLACEHOLDER_IMAGE,
    lat,
    lng,
    price: p.maxPrice ?? p.minPrice ?? 0,
    rating: p.rating ?? 0,
    tags: tagList.length ? tagList : [p.category],
    weather: inferWeatherFromTags(p.tags),
    vibe: inferVibeFromTags(p.tags),
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
