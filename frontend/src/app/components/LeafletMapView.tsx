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
  userLocation?: LatLng;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
}

const createCustomIcon = (category: string = 'activity', index?: number, isPending?: boolean) => {
  const colors: Record<string, string> = {
    food: '#f59e0b', // Amber
    drink: '#3b82f6', // Blue
    activity: '#10b981', // Emerald
    default: '#FF6B35' // Vietjourney Orange
  };
  
  const baseColor = colors[category.toLowerCase()] || colors.default;
  const color = isPending ? '#94a3b8' : baseColor; // Gray for pending proposals
  const borderStyle = isPending ? 'border: 2px dashed #475569;' : 'border: 2px solid white;';
  
  const label = index !== undefined ? `<div style="position:absolute;top:-8px;right:-8px;background:white;color:${color};width:18px;height:18px;border-radius:50%;display:flex;align-items:center;justify-center;font-size:10px;font-weight:900;border:2px solid ${color};box-shadow:0 2px 4px rgba(0,0,0,0.2)">${index + 1}</div>` : '';

  return L.divIcon({
    className: 'vj-custom-marker',
    html: `
      <div style="position:relative; opacity: ${isPending ? '0.85' : '1'};">
        <div style="width:24px;height:24px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg); ${borderStyle} box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>
        <div style="width:8px;height:8px;border-radius:50%;background:white;position:absolute;top:8px;left:8px;"></div>
        ${label}
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

const userMarkerIcon = L.divIcon({
  className: 'vj-user-marker',
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#ef4444;border:3px solid #fff;box-shadow:0 0 0 4px rgba(239,68,68,0.2), 0 2px 10px rgba(0,0,0,0.3);animation: pulse 2s infinite;"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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

      {locations.map((loc, idx) => {
        const isPending = (loc as any).isPending || false;
        const authorUsername = (loc as any).authorUsername;
        
        return (
          <Marker 
            key={loc.id} 
            position={{ lat: loc.lat, lng: loc.lng }} 
            icon={createCustomIcon(loc.category, showRoute ? idx : undefined, isPending)}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                {isPending && (
                  <div style={{ 
                    marginBottom: 8, 
                    padding: '4px 8px', 
                    background: '#fffbeb', 
                    border: '1px solid #fde68a', 
                    borderRadius: 6,
                    color: '#92400e',
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}>
                    <span style={{ fontSize: 14 }}>💡</span> Đề xuất bởi {authorUsername || 'Thành viên'}
                  </div>
                )}
                <div style={{ marginBottom: 4, fontWeight: 800 }}>
                  {showRoute ? `${idx + 1}. ` : ''}
                  {loc.name}
                </div>
                {!isPending && <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>{loc.description}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  {!isPending && (
                    <>
                      <span>⭐ {loc.rating}</span>
                      <span style={{ opacity: 0.4 }}>•</span>
                      <span style={{ color: '#FF6B35', fontWeight: 800 }}>{formatVND(loc.price)}</span>
                    </>
                  )}
                  {isPending && <span style={{ color: '#92400e', fontStyle: 'italic' }}>Chưa có thông tin chi tiết</span>}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {userLocation && Number.isFinite(userLocation[0]) && Number.isFinite(userLocation[1]) ? (
        <Marker position={{ lat: userLocation[0], lng: userLocation[1] }} icon={userMarkerIcon}>
          <Popup>Bạn đang ở đây</Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
