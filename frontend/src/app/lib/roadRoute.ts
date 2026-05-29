export type LatLngTuple = [lat: number, lng: number];

type OsrmGeoJsonResponse = {
  code: string;
  routes?: Array<{ geometry?: { type?: string; coordinates?: [number, number][] } }>;
};

/** Max waypoints per OSRM URL to stay under typical URL limits and server limits. */
const OSRM_CHUNK_SIZE = 23;

function flipToLatLng(coords: [number, number][]): LatLngTuple[] {
  return coords.map(([lng, lat]) => [lat, lng]);
}

function dedupeConsecutive(pts: LatLngTuple[]): LatLngTuple[] {
  const out: LatLngTuple[] = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
  }
  return out;
}

async function fetchOsrmSegment(
  waypoints: LatLngTuple[],
  profile: 'driving' | 'foot',
  signal?: AbortSignal,
): Promise<LatLngTuple[]> {
  if (waypoints.length < 2) return waypoints;
  const path = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/${profile}/${path}?overview=full&geometries=geojson`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const data = (await res.json()) as OsrmGeoJsonResponse;
  if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates?.length) {
    throw new Error(data.code || 'OSRM no route');
  }
  return flipToLatLng(data.routes[0].geometry.coordinates);
}

/**
 * Road-following polyline (driving) using the public OSRM demo server.
 * Falls back to callers: use try/catch and straight-line waypoints.
 *
 * For production, prefer your own OSRM/GraphHopper or Google Routes API.
 */
export async function fetchRoadRoutePolyline(
  waypoints: LatLngTuple[],
  options?: { signal?: AbortSignal; profile?: 'driving' | 'foot' },
): Promise<LatLngTuple[]> {
  const profile = options?.profile ?? 'driving';
  const signal = options?.signal;
  const pts = dedupeConsecutive(waypoints.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b)));

  if (pts.length < 2) return pts;

  /* One request if small enough */
  if (pts.length <= OSRM_CHUNK_SIZE) {
    return fetchOsrmSegment(pts, profile, signal);
  }

  /* Stitch chunked routes: overlap start of next chunk with last point of previous */
  const merged: LatLngTuple[] = [];
  for (let i = 0; i < pts.length - 1; i += OSRM_CHUNK_SIZE - 1) {
    const chunk = pts.slice(i, Math.min(i + OSRM_CHUNK_SIZE, pts.length));
    if (chunk.length < 2) break;
    const seg = await fetchOsrmSegment(chunk, profile, signal);
    if (merged.length === 0) merged.push(...seg);
    else merged.push(...seg.slice(1));
  }
  return dedupeConsecutive(merged);
}
