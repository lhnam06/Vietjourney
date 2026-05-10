import { setOptions } from '@googlemaps/js-api-loader';

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

/**
 * Must run once at startup, before any `importLibrary()` call.
 */
const rawKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const key = typeof rawKey === 'string' ? rawKey.trim() : '';

if (key) {
  setOptions({ key });
}

/** Runs when the Maps script detects an invalid key / referrer / API enablement (before React may be ready). */
if (typeof window !== 'undefined' && key) {
  const previous = window.gm_authFailure;
  window.gm_authFailure = function gmAuthFailureHandler() {
    previous?.();
    console.error(
      '[Vietjourney Maps] Authentication failed. Check: (1) Maps JavaScript API enabled and billing on,' +
        ' (2) HTTP referrer restrictions include this exact origin (localhost vs 127.0.0.1),' +
        ' (3) API key is from the project with billing enabled.'
    );
  };
}
