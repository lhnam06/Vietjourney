import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../data/mockData';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

type LatLng = [number, number];

interface LeafletMapViewProps {
  locations: Location[];
  center?: LatLng;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
}

const formatVND = (amount: number) => {
  if (amount === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  })
    .format(amount)
    .replace(/\s?VND$/, ' VND');
};

function FitBounds({ points, fallbackCenter }: { points: LatLng[]; fallbackCenter: LatLng }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (points.length >= 2) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
      map.fitBounds(bounds, { padding: [48, 48] });
      return;
    }
    if (points.length === 1) {
      map.setView({ lat: points[0][0], lng: points[0][1] }, 14, { animate: true });
      return;
    }
    map.setView({ lat: fallbackCenter[0], lng: fallbackCenter[1] }, 13, { animate: true });
  }, [fallbackCenter, map, points]);

  return null;
}

const defaultMarkerIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function LeafletMapView({
  locations,
  center = [21.0285, 105.8542],
  showRoute = false,
  routeCoordinates = [],
}: LeafletMapViewProps) {
  const points = useMemo<LatLng[]>(() => {
    if (showRoute && routeCoordinates.length) return routeCoordinates;
    return locations.map((l) => [l.lat, l.lng]);
  }, [locations, routeCoordinates, showRoute]);

  const polyline = useMemo(() => {
    if (!showRoute) return [];
    const coords = routeCoordinates.length ? routeCoordinates : locations.map((l) => [l.lat, l.lng] as LatLng);
    return coords.filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  }, [locations, routeCoordinates, showRoute]);

  return (
    <MapContainer
      center={{ lat: center[0], lng: center[1] }}
      zoom={13}
      zoomControl={true}
      scrollWheelZoom={true}
      className="w-full h-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <FitBounds points={points} fallbackCenter={center} />

      {polyline.length >= 2 && (
        <Polyline
          positions={polyline.map(([lat, lng]) => ({ lat, lng }))}
          pathOptions={{ color: '#FF6B35', weight: 5, opacity: 0.9 }}
        />
      )}

      {locations.map((loc, idx) => (
        <Marker key={loc.id} position={{ lat: loc.lat, lng: loc.lng }} icon={defaultMarkerIcon}>
          <Popup>
            <div style={{ minWidth: 180 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>
                {showRoute ? `${idx + 1}. ` : ''}
                {loc.name}
              </div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>{loc.description}</div>
              <div style={{ fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <span>⭐ {loc.rating}</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ color: '#FF6B35', fontWeight: 800 }}>{formatVND(loc.price)}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

