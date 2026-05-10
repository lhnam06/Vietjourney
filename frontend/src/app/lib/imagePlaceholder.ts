import type { SyntheticEvent } from 'react';

/** Inline SVG — no network; avoids Firefox ORB / aborted CDN loads when external images are blocked. */
export const LOCATION_IMAGE_FALLBACK =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320"><rect fill="#e2e8f0" width="320" height="320"/><path fill="#94a3b8" d="M160 96a40 40 0 1 0 0 80 40 40 0 0 0 0-80zm0 104c-52.8 0-100 26.4-100 60v16h200v-16c0-33.6-47.2-60-100-60z"/>`
  );

export function onLocationImageError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = LOCATION_IMAGE_FALLBACK;
  img.onerror = null;
}
