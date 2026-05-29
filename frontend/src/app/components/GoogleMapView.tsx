import { useEffect, useRef, useState } from 'react';
import { importLibrary } from '@googlemaps/js-api-loader';
import type { Location } from '../types/domain';

type LatLng = [number, number];

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}

interface GoogleMapViewProps {
  mapId?: string;
  locations: Location[];
  center?: LatLng;
  userLocation?: LatLng;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
}

export default function GoogleMapView({
  mapId,
  locations,
  center = [21.0285, 105.8542],
  userLocation,
  showRoute = false,
  routeCoordinates = [],
}: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const prevGmAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      prevGmAuthFailure?.();
      setMapError('Google Maps từ chối yêu cầu. Kiểm tra API key, billing và HTTP referrer trong Google Cloud.');
    };
    return () => {
      window.gm_authFailure = prevGmAuthFailure;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setMapError(null);
      if (!containerRef.current) return;
      if (mapRef.current) return;

      try {
        await importLibrary('maps');
      } catch (e) {
        if (!cancelled) {
          setMapError(e instanceof Error ? e.message : 'Không tải được thư viện Google Maps.');
        }
        return;
      }

      if (cancelled || !containerRef.current) return;

      try {
        mapRef.current = new google.maps.Map(containerRef.current, {
          ...(mapId ? { mapId } : {}),
          center: { lat: center[0], lng: center[1] },
          zoom: 13,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
        });
      } catch (e) {
        if (!cancelled) {
          setMapError(e instanceof Error ? e.message : 'Không khởi tạo được bản đồ.');
        }
        return;
      }

      setReady(true);
    }

    void init();
    return () => {
      cancelled = true;
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      userMarkerRef.current?.setMap(null);
      userMarkerRef.current = null;
      polylineRef.current?.setMap(null);
      polylineRef.current = null;
      mapRef.current = null;
      if (containerRef.current) containerRef.current.innerHTML = '';
      setReady(false);
    };
  }, [mapId]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    locations.forEach((loc, idx) => {
      if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return;

      const marker = new google.maps.Marker({
        map: mapRef.current!,
        position: { lat: loc.lat, lng: loc.lng },
        title: loc.name,
        label: showRoute ? String(idx + 1) : undefined,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#ff6b35',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 9,
        },
      });
      markersRef.current.push(marker);
    });

    if (locations.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      locations.forEach((l) => bounds.extend({ lat: l.lat, lng: l.lng }));
      mapRef.current.fitBounds(bounds, 60);
    } else if (locations.length === 1) {
      mapRef.current.setCenter({ lat: locations[0].lat, lng: locations[0].lng });
      mapRef.current.setZoom(14);
    } else {
      mapRef.current.setCenter({ lat: center[0], lng: center[1] });
      mapRef.current.setZoom(13);
    }
  }, [center, locations, ready, showRoute]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = null;
    if (!userLocation) return;
    if (!Number.isFinite(userLocation[0]) || !Number.isFinite(userLocation[1])) return;

    userMarkerRef.current = new google.maps.Marker({
      map: mapRef.current,
      position: { lat: userLocation[0], lng: userLocation[1] },
      title: 'Bạn đang ở đây',
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#2563eb',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 3,
        scale: 7,
      },
      zIndex: 999,
    });
  }, [ready, userLocation]);

  useEffect(() => {
    if (!ready || !mapRef.current) return;

    polylineRef.current?.setMap(null);
    polylineRef.current = null;
    if (!showRoute || routeCoordinates.length < 2) return;

    polylineRef.current = new google.maps.Polyline({
      map: mapRef.current,
      path: routeCoordinates.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#ff6b35',
      strokeOpacity: 0.9,
      strokeWeight: 4,
      icons: [
        {
          icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 },
          offset: '0',
          repeat: '16px',
        },
      ],
    });
  }, [ready, routeCoordinates, showRoute]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      {mapError ? (
        <div className="pointer-events-none absolute inset-x-4 top-4 z-10 rounded-lg border border-amber-300 bg-amber-50/95 px-3 py-2 text-xs text-amber-900 shadow">
          <p className="font-semibold">Không tải được Google Maps</p>
          <p className="mt-0.5 leading-relaxed">{mapError}</p>
        </div>
      ) : null}
    </div>
  );
}
