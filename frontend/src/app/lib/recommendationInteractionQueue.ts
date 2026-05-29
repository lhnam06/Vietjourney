import { API_BASE } from './api';
import { getStoredToken } from './authApi';
import { postInteractionBatch, type PlaceInteractionPayload } from './recommendationApi';

const FLUSH_MS = 3000;
const MAX_BATCH = 45;
const VIEWPORT_DEBOUNCE_MS = 12_000;

let queue: PlaceInteractionPayload[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const lastViewportAt = new Map<string, number>();

function scheduleFlush() {
  if (timer != null) return;
  timer = setTimeout(() => {
    timer = null;
    void flushRecommendationInteractionQueue();
  }, FLUSH_MS);
}

/**
 * Queues a recommendation interaction and flushes on a short timer or when the batch is full.
 * No-ops when there is no access token (callers may still enqueue; flush drops empty token batches).
 */
export function enqueueRecommendationInteraction(event: PlaceInteractionPayload) {
  if (!getStoredToken()) return;

  if (event.eventType === 'VIEWPORT') {
    const now = Date.now();
    const prev = lastViewportAt.get(event.placeId) ?? 0;
    if (now - prev < VIEWPORT_DEBOUNCE_MS) return;
    lastViewportAt.set(event.placeId, now);
  }

  queue.push(event);
  if (queue.length >= MAX_BATCH) {
    void flushRecommendationInteractionQueue();
    return;
  }
  scheduleFlush();
}

export async function flushRecommendationInteractionQueue(): Promise<void> {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  const interactions = queue.splice(0, queue.length);
  if (interactions.length === 0) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    await postInteractionBatch(token, interactions);
  } catch {
    /* avoid retry storms; events are best-effort */
  }
}

/** Best-effort send on unload (Authorization + JSON body via keepalive). */
export function flushRecommendationInteractionQueueKeepalive() {
  const interactions = queue.splice(0, queue.length);
  if (interactions.length === 0) return;
  const token = getStoredToken();
  if (!token) return;
  try {
    void fetch(`${API_BASE}/api/v1/recommendations/interactions/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ interactions }),
      keepalive: true,
    });
  } catch {
    /* ignore */
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    flushRecommendationInteractionQueueKeepalive();
  });
}
