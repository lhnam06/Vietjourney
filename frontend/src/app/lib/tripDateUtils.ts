function isoOrdinal(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  return y! * 10_000 + m! * 100 + d!;
}

/** Clamp YYYY-MM-DD to [tripStart, tripEnd] so timetable rows stay inside the trip window. */
export function clampIsoDateToTripRange(
  tripStart: string,
  tripEnd: string,
  candidate: string,
): string {
  const c = isoOrdinal(candidate);
  const s = isoOrdinal(tripStart);
  const e = isoOrdinal(tripEnd);
  if (c == null || s == null || e == null) return candidate;
  if (c < s) return tripStart;
  if (c > e) return tripEnd;
  return candidate;
}
