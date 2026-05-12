import type { TimelineItem } from '../data/mockData';

export const TIMETABLE_DAY_START_HOUR = 6;
export const TIMETABLE_DAY_END_HOUR = 23;
export const PX_PER_HOUR = 52;

export function timeToMinutes(t: string): number {
  const [hh, mm] = t.split(':').map(Number);
  return (hh || 0) * 60 + (mm || 0);
}

/** Clamp to same calendar day [00:00 .. 23:59] for itinerary rows. */
export function minutesToTime(totalMinutes: number): string {
  const m = Math.max(0, Math.min(24 * 60 - 1, totalMinutes));
  const h = Math.floor(m / 60);
  const mi = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

export function daySpanMinutes(): number {
  return (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * 60;
}

/** Inclusive ISO date range `YYYY-MM-DD` between trip bounds. */
export function eachTripDay(startIso: string, endIso: string): string[] {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end || start > end) return [];
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function parseIsoDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export type TimetableBlock = TimelineItem & {
  startMin: number;
  endMin: number;
  lane: number;
  laneCount: number;
};

function clampToDay(startMin: number, endMin: number): { s: number; e: number } | null {
  const dayStart = TIMETABLE_DAY_START_HOUR * 60;
  const dayEnd = TIMETABLE_DAY_END_HOUR * 60;
  const s = Math.max(startMin, dayStart);
  const e = Math.min(endMin, dayEnd);
  if (e <= s) return null;
  return { s, e };
}

function assignLanesForDay(items: TimelineItem[]): TimetableBlock[] {
  type Row = TimelineItem & { startMin: number; endMin: number };
  const rows: Row[] = items
    .map((it) => {
      const startMin = timeToMinutes(it.startTime);
      const endMin = timeToMinutes(it.endTime);
      const clipped = clampToDay(startMin, endMin);
      if (!clipped) return null;
      return { ...it, startMin: clipped.s, endMin: clipped.e };
    })
    .filter((x): x is Row => x !== null)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  const laneEnds: number[] = [];
  const blocks: TimetableBlock[] = [];

  for (const it of rows) {
    let lane = -1;
    for (let L = 0; L < laneEnds.length; L++) {
      if (laneEnds[L]! <= it.startMin) {
        lane = L;
        break;
      }
    }
    if (lane < 0) {
      lane = laneEnds.length;
      laneEnds.push(it.endMin);
    } else {
      laneEnds[lane] = it.endMin;
    }
    blocks.push({ ...it, lane, laneCount: 0 });
  }

  const laneCount = Math.max(laneEnds.length, 1);
  return blocks.map((b) => ({ ...b, laneCount }));
}

export function layoutsByDate(items: TimelineItem[]): Map<string, TimetableBlock[]> {
  const byDay = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const list = byDay.get(it.date) ?? [];
    list.push(it);
    byDay.set(it.date, list);
  }

  const out = new Map<string, TimetableBlock[]>();
  for (const [date, dayItems] of byDay) {
    out.set(date, assignLanesForDay(dayItems));
  }
  return out;
}
