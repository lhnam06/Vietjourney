import { useEffect, useRef, useState } from 'react';

export type GeolocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported' | 'unavailable';

export type GeolocationFix = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

function isValidFix(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return true;
}

function readFix(position: GeolocationPosition): GeolocationFix | null {
  const { latitude, longitude, accuracy } = position.coords;
  if (!isValidFix(latitude, longitude)) return null;
  return {
    lat: latitude,
    lng: longitude,
    accuracy: Number.isFinite(accuracy) ? Math.max(accuracy, 1) : 9999,
    timestamp: position.timestamp,
  };
}

/** Prefer the most accurate recent GPS fix via watchPosition. */
export function useGeolocation(enabled = true) {
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [fix, setFix] = useState<GeolocationFix | null>(null);
  const bestAccuracyRef = useRef(Number.POSITIVE_INFINITY);
  const hasFixRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      setFix(null);
      bestAccuracyRef.current = Number.POSITIVE_INFINITY;
      hasFixRef.current = false;
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unsupported');
      setFix(null);
      return;
    }

    let cancelled = false;
    let watchId: number | null = null;
    bestAccuracyRef.current = Number.POSITIVE_INFINITY;
    hasFixRef.current = false;
    setStatus('loading');
    setFix(null);

    const applyFix = (candidate: GeolocationFix) => {
      if (candidate.accuracy >= bestAccuracyRef.current && hasFixRef.current) return;
      bestAccuracyRef.current = candidate.accuracy;
      hasFixRef.current = true;
      setFix(candidate);
      setStatus('granted');
    };

    const onSuccess = (position: GeolocationPosition) => {
      if (cancelled) return;
      const next = readFix(position);
      if (!next) return;
      applyFix(next);
    };

    const onError = (error: GeolocationPositionError) => {
      if (cancelled) return;
      if (error.code === error.PERMISSION_DENIED) {
        setStatus('denied');
        setFix(null);
        hasFixRef.current = false;
        return;
      }
      if (hasFixRef.current) return;
      setStatus('unavailable');
    };

    watchId = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    });

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 30000,
    });

    return () => {
      cancelled = true;
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  return {
    status,
    fix,
    position: fix ? ([fix.lat, fix.lng] as [number, number]) : null,
    accuracy: fix?.accuracy ?? null,
  };
}
