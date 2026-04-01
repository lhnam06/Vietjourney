import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import type { Location } from '../data/mockData';

type LatLng = [number, number];

interface GoogleMapViewProps {
  apiKey: string;
  locations: Location[];
  center?: LatLng;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
}

export default function GoogleMapView({
  apiKey,
  locations,
  center = [21.0285, 105.8542],
  showRoute = false,
  routeCoordinates = [],
}: GoogleMapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [ready, setReady] = useState(false);

  const loader = useMemo(() => {
    return new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['marker'],
    });
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current) return;
      if (mapRef.current) return;

      await loader.load();
      if (cancelled) return;

      mapRef.current = new google.maps.Map(containerRef.current, {
        center: { lat: center[0], lng: center[1] },
        zoom: 13,
        mapTypeControl: false,
        fullscreenControl: false,
        streetViewControl: false,
        clickableIcons: false,
      });

      setReady(true);
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [center, loader]);

  // Keep markers in sync
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];

    locations.forEach((loc, idx) => {
      const el = document.createElement('div');
      el.style.width = '28px';
      el.style.height = '28px';
      el.style.borderRadius = '999px';
      el.style.background = '#ff6b35';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 8px 18px rgba(0,0,0,.18)';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontWeight = '700';
      el.style.fontSize = '12px';
      el.textContent = showRoute ? String(idx + 1) : '';

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current!,
        position: { lat: loc.lat, lng: loc.lng },
        title: loc.name,
        content: el,
      });
      markersRef.current.push(marker);
    });

    // Fit bounds when we have markers
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

  // Route polyline
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

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

  return <div ref={containerRef} className="w-full h-full" />;
}

