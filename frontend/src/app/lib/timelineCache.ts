import { cacheGet, cacheSet } from './apiCache';
import type { TimelineItem } from '../data/mockData';

export type TimelineCacheData = {
  items: TimelineItem[];
  tripMeta: {
    id: string;
    title: string;
    destination?: string;
    startDate: string;
    endDate: string;
    ownerId?: string;
    version?: number;
  };
  labelByLocationId: Record<string, string>;
  placesByLocationId?: Record<string, unknown>;
  proposals?: unknown[];
};

export function timelineCacheKey(tripId: string) {
  return `timeline:${tripId}`;
}

export function readTimelineCache(tripId: string): TimelineCacheData | undefined {
  return cacheGet<TimelineCacheData>(timelineCacheKey(tripId));
}

export function writeTimelineCache(tripId: string, data: TimelineCacheData) {
  cacheSet(timelineCacheKey(tripId), data);
}

export function mergeTimelineCacheItems(
  tripId: string,
  items: TimelineItem[],
  extras?: Partial<Omit<TimelineCacheData, 'items'>>
) {
  const prev = readTimelineCache(tripId);
  writeTimelineCache(tripId, {
    items,
    tripMeta: extras?.tripMeta ?? prev?.tripMeta ?? {
      id: tripId,
      title: '',
      startDate: '',
      endDate: '',
    },
    labelByLocationId: extras?.labelByLocationId ?? prev?.labelByLocationId ?? {},
    placesByLocationId: extras?.placesByLocationId ?? prev?.placesByLocationId,
    proposals: extras?.proposals ?? prev?.proposals,
  });
}

/** Workspace cache may omit labels — derive from places when needed. */
export function resolveTimelineLabels(
  cached: Partial<TimelineCacheData> | undefined
): Record<string, string> {
  if (!cached) return {};
  if (cached.labelByLocationId && Object.keys(cached.labelByLocationId).length > 0) {
    return cached.labelByLocationId;
  }
  const places = cached.placesByLocationId as Record<string, { name?: string | null }> | undefined;
  if (!places) return {};
  return Object.fromEntries(
    Object.entries(places)
      .map(([id, place]) => [id, place?.name?.trim() ?? ''])
      .filter(([, name]) => name.length > 0)
  );
}
