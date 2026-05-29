import { requestJson } from './api';
import type { TimelineItem } from '../types/domain';

export type ApiTimelinePlace = {
  id: string;
  name: string;
  address?: string | null;
  rating?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  imageUrl?: string | null;
};

export type ApiTimelineEvent = {
  id: string;
  externalPlaceId?: string | null;
  place?: ApiTimelinePlace | null;
  category: string;
  startTime: string;
  endTime: string;
  orderIndex?: number | null;
  notes?: string | null;
  status?: string;
  version?: number | null;
};

export type ApiTimelineMember = {
  id: string;
  userId?: string;
  username?: string;
  displayName?: string;
  role?: string;
};

export type ApiTimelineDetail = {
  id: string;
  title: string;
  description?: string | null;
  startDate: string;
  endDate: string;
  visibility?: string;
  ownerId?: string;
  ownerUsername?: string;
  ownerDisplayName?: string;
  members?: ApiTimelineMember[];
  events?: ApiTimelineEvent[];
  activeInviteCode?: string | null;
  version?: number;
};

export type ApiResetInviteCodeResponse = {
  code: string;
  role: string;
  maxUses: number;
  expiresAt: string;
};

export async function getMyTimelines(accessToken: string) {
  return requestJson<ApiTimelineDetail[]>('/api/v1/timelines/mine', { accessToken });
}

export async function getTimelineDetail(timelineId: string, accessToken: string, signal?: AbortSignal) {
  return requestJson<ApiTimelineDetail>(`/api/v1/timelines/${encodeURIComponent(timelineId)}`, {
    accessToken,
    signal,
  });
}

export async function resetTimelineInviteCode(
  timelineId: string,
  body: { role: string; maxUses?: number; expiresInHours?: number },
  accessToken: string
) {
  return requestJson<ApiResetInviteCodeResponse>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/invite-code/reset`,
    { method: 'POST', body: JSON.stringify(body), accessToken }
  );
}

export async function joinTimelineByCode(code: string, accessToken: string) {
  return requestJson<{ timelineId: string; role: string }>(
    `/api/v1/timelines/join-by-code`,
    { method: 'POST', body: JSON.stringify({ code: code.trim().toUpperCase() }), accessToken }
  );
}

export function isoLocalDateTimeToHHmm(iso: string): string {
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  return '09:00';
}

export async function moveTimelineEvent(
  timelineId: string,
  eventId: string,
  body: { startTime: string; endTime: string; orderIndex?: number },
  accessToken: string
) {
  return requestJson<ApiTimelineEvent>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/events/${encodeURIComponent(eventId)}/move`,
    { method: 'PATCH', body: JSON.stringify(body), accessToken }
  );
}

export async function addTimelineEvent(
  timelineId: string,
  body: {
    externalPlaceId?: string;
    category: string;
    startTime: string;
    endTime: string;
    notes?: string;
    orderIndex?: number;
    status?: 'PLANNED' | 'CONFIRMED' | 'CANCELLED';
  },
  accessToken: string
) {
  return requestJson<ApiTimelineEvent>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/events`,
    { method: 'POST', body: JSON.stringify(body), accessToken }
  );
}

export async function deleteTimelineEvent(
  timelineId: string,
  eventId: string,
  accessToken: string
) {
  return requestJson<void>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/events/${encodeURIComponent(eventId)}`,
    { method: 'DELETE', accessToken }
  );
}

export async function reorderTimelineEvent(
  timelineId: string,
  eventId: string,
  body: { orderIndex: number },
  accessToken: string
) {
  return requestJson<ApiTimelineEvent>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/events/${encodeURIComponent(eventId)}/reorder`,
    { method: 'PATCH', body: JSON.stringify(body), accessToken }
  );
}

export function mapApiTimelineToTimetable(detail: ApiTimelineDetail): {
  items: TimelineItem[];
  labelByLocationId: Record<string, string>;
  placesByLocationId: Record<string, ApiTimelinePlace>;
  tripMeta: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    ownerId: string;
    version: number;
  };
} {
  const labelByLocationId: Record<string, string> = {};
  const placesByLocationId: Record<string, ApiTimelinePlace> = {};
  
  if (!detail) {
    return {
      items: [],
      labelByLocationId: {},
      placesByLocationId: {},
      tripMeta: { id: '', title: '', destination: '', startDate: '', endDate: '' }
    };
  }

  const items: TimelineItem[] = (detail.events ?? [])
    .filter(ev => ev && ev.startTime) // Ensure event and startTime exist
    .map((ev) => {
      // Backend uses uppercase enum: FOOD, DRINK, ACTIVITY
      // Frontend expects lowercase or specific prefixes for matching mock data
      const rawCat = (ev.category ?? 'ACTIVITY').toLowerCase();
      
      // Clean the externalPlaceId: it might have come back with a prefix if we saved it that way
      let cleanId = ev.externalPlaceId || ev.id;
      if (cleanId.includes(':')) {
        cleanId = cleanId.split(':').pop()!;
      }

      // Reconstruct the frontend locationId using the same logic as recommendationUtils
      // IMPORTANT: Always use string IDs for consistent lookup
      const placeIdStr = ev.place?.id ? String(ev.place.id) : null;
      const locationId = placeIdStr || `${rawCat}:${cleanId}`;
      
      const name = ev.place?.name?.trim() || 'Hoạt động';
      labelByLocationId[locationId] = name;
      if (ev.place) {
        placesByLocationId[locationId] = ev.place;
      }

      const date = ev.startTime ? ev.startTime.slice(0, 10) : new Date().toISOString().slice(0, 10);
      
      console.log(`[timelineApi] Mapped event ${ev.id}:`, { locationId, hasPlace: !!ev.place });
      
      return {
        id: ev.id,
        locationId,
        startTime: isoLocalDateTimeToHHmm(ev.startTime),
        endTime: isoLocalDateTimeToHHmm(ev.endTime),
        date,
        notes: ev.notes?.trim() ? ev.notes : undefined,
      };
    });

  return {
    items,
    labelByLocationId,
    placesByLocationId,
    tripMeta: {
      id: detail.id || '',
      title: detail.title || '',
      destination: detail.description || 'Vietnam',
      startDate: detail.startDate || '',
      endDate: detail.endDate || '',
      ownerId: detail.ownerId || '',
      version: detail.version || 1
    }
  };
}
export async function createTimeline(
  body: {
    title: string;
    description?: string;
    startDate: string;
    endDate: string;
    visibility: 'PRIVATE' | 'SHARED' | 'PUBLIC_READ';
  },
  accessToken: string
) {
  return requestJson<ApiTimelineDetail>('/api/v1/timelines', {
    method: 'POST',
    body: JSON.stringify(body),
    accessToken,
  });
}

export async function getPendingProposals(timelineId: string, accessToken: string) {
  return requestJson<any[]>(`/api/v1/timelines/${encodeURIComponent(timelineId)}/proposals`, {
    accessToken,
  });
}

export async function decideProposal(
  timelineId: string,
  proposalId: string,
  status: 'ACCEPTED' | 'REJECTED',
  accessToken: string
) {
  return requestJson<void>(
    `/api/v1/timelines/${encodeURIComponent(timelineId)}/proposals/${encodeURIComponent(proposalId)}/decide?status=${status}`,
    { method: 'PATCH', accessToken }
  );
}
