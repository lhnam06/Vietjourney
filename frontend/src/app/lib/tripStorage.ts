import type { TimelineItem, Transaction, Trip } from '../data/mockData';

type TripData = {
  trip: Trip;
  timeline: TimelineItem[];
  transactions: Transaction[];
};

const keyForTrip = (tripId: string) => `vj:trip:${tripId}`;
const keyLastTrip = `vj:lastTripId`;

export function getLastTripId(fallback = 'trip-1') {
  try {
    const raw = localStorage.getItem(keyLastTrip);
    return raw || fallback;
  } catch {
    return fallback;
  }
}

export function setLastTripId(tripId: string) {
  try {
    localStorage.setItem(keyLastTrip, tripId);
  } catch {
    // ignore
  }
}

export function loadTripData(tripId: string): TripData | null {
  try {
    const raw = localStorage.getItem(keyForTrip(tripId));
    if (!raw) return null;
    return JSON.parse(raw) as TripData;
  } catch {
    return null;
  }
}

export function saveTripData(tripId: string, data: TripData) {
  try {
    localStorage.setItem(keyForTrip(tripId), JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function upsertTimelineItem(tripId: string, trip: Trip, item: TimelineItem, baseTimeline: TimelineItem[] = [], baseTransactions: Transaction[] = []) {
  const current = loadTripData(tripId) ?? { trip, timeline: baseTimeline, transactions: baseTransactions };
  const nextTimeline = (() => {
    const idx = current.timeline.findIndex((t) => t.id === item.id);
    if (idx >= 0) {
      const copy = current.timeline.slice();
      copy[idx] = item;
      return copy;
    }
    return [...current.timeline, item];
  })();
  saveTripData(tripId, { ...current, trip, timeline: nextTimeline });
}

export function deleteTimelineItem(tripId: string, trip: Trip, itemId: string, baseTimeline: TimelineItem[] = [], baseTransactions: Transaction[] = []) {
  const current = loadTripData(tripId) ?? { trip, timeline: baseTimeline, transactions: baseTransactions };
  const nextTimeline = current.timeline.filter((t) => t.id !== itemId);
  const nextTransactions = current.transactions.filter((tx) => tx.linkedActivity !== itemId);
  saveTripData(tripId, { ...current, trip, timeline: nextTimeline, transactions: nextTransactions });
}

export function appendTransaction(tripId: string, trip: Trip, tx: Transaction, baseTimeline: TimelineItem[] = [], baseTransactions: Transaction[] = []) {
  const current = loadTripData(tripId) ?? { trip, timeline: baseTimeline, transactions: baseTransactions };
  saveTripData(tripId, { ...current, trip, transactions: [...current.transactions, tx] });
}

