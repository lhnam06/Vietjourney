import { requestJson } from './api';
import type { TimelineItem } from '../data/mockData';

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
};

export async function getTimelineDetail(timelineId: string, accessToken: string) {
  return requestJson<ApiTimelineDetail>(`/api/v1/timelines/${encodeURIComponent(timelineId)}`, {
    accessToken,
  });
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

export function mapApiTimelineToTimetable(detail: ApiTimelineDetail): {
  items: TimelineItem[];
  labelByLocationId: Record<string, string>;
  tripMeta: {
    id: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
  };
} {
  const labelByLocationId: Record<string, string> = {};
  const items: TimelineItem[] = (detail.events ?? []).map((ev) => {
    const cat = String(ev.category ?? 'place').toLowerCase();
    const locationId =
      ev.place?.id ??
      (ev.externalPlaceId ? `${cat}:${ev.externalPlaceId}` : ev.id);
    const name = ev.place?.name?.trim() || 'Hoạt động';
    labelByLocationId[locationId] = name;

    const date = ev.startTime.slice(0, 10);
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
    tripMeta: {
      id: detail.id,
      title: detail.title,
      destination: detail.description?.trim() || '',
      startDate: detail.startDate,
      endDate: detail.endDate,
    },
  };
}
