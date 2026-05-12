import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation } from 'lucide-react';
import type { Location } from '../data/mockData';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

type LatLng = [number, number];

interface LeafletMapViewProps {
  locations: Location[];
  center?: LatLng;
  userLocation?: LatLng;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
  onAddToItinerary?: (location: Location) => void;
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

const userMarkerIcon = L.divIcon({
  className: 'vj-user-marker',
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid #fff;box-shadow:0 0 0 3px rgba(37,99,235,.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

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

function FitBounds({
  points,
  fallbackCenter,
}: {
  points: LatLng[];
  fallbackCenter: LatLng;
}) {
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

export default function LeafletMapView({
  locations,
  center = [21.0285, 105.8542],
  userLocation,
  showRoute = false,
  routeCoordinates = [],
  onAddToItinerary,
}: LeafletMapViewProps) {
  const points = useMemo<LatLng[]>(() => {
    if (showRoute && routeCoordinates.length) return routeCoordinates;
    return locations
      .map((l) => [l.lat, l.lng] as LatLng)
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
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
      className="h-full w-full"
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
              <div style={{ marginBottom: 4, fontWeight: 800 }}>
                {showRoute ? `${idx + 1}. ` : ''}
                {loc.name}
              </div>
              <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>{loc.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <span>⭐ {loc.rating}</span>
                <span style={{ opacity: 0.4 }}>•</span>
                <span style={{ color: '#FF6B35', fontWeight: 800 }}>{formatVND(loc.price)}</span>
                {onAddToItinerary ? (
                  <button
                    type="button"
                    onClick={() => onAddToItinerary(loc)}
                    title="Thêm vào lịch trình"
                    aria-label={`Thêm ${loc.name} vào lịch trình`}
                    style={{
                      marginLeft: 'auto',
                      border: '1px solid #fb923c',
                      background: '#fff7ed',
                      color: '#c2410c',
                      borderRadius: 9999,
                      width: 28,
                      height: 28,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <Navigation size={14} />
                  </button>
                ) : null}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {userLocation && Number.isFinite(userLocation[0]) && Number.isFinite(userLocation[1]) ? (
        <Marker position={{ lat: userLocation[0], lng: userLocation[1] }} icon={userMarkerIcon}>
          <Popup>Bạn đang ở đây</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
