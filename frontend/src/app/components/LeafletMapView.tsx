import { useEffect, useMemo } from 'react';
import { Circle, MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Location } from '../types/domain';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

type LatLng = [number, number];

interface LeafletMapViewProps {
  locations: Location[];
  center?: LatLng;
  userLocation?: LatLng;
  userAccuracy?: number;
  showRoute?: boolean;
  routeCoordinates?: LatLng[];
  onMapReady?: (api: LeafletMapApi) => void;
}

export type LeafletMapApi = {
  flyToUser: () => void;
};

function MapReadyBridge({
  userLocation,
  onMapReady,
}: {
  userLocation?: LatLng;
  onMapReady?: (api: LeafletMapApi) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!onMapReady) return;
    onMapReady({
      flyToUser: () => {
        if (!userLocation) return;
        map.flyTo({ lat: userLocation[0], lng: userLocation[1] }, Math.max(map.getZoom(), 15), {
          animate: true,
          duration: 0.8,
        });
      },
    });
  }, [map, onMapReady, userLocation]);

  return null;
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
  html: `
    <div class="vj-user-marker-dot" aria-hidden="true">
      <span class="vj-user-marker-pulse"></span>
      <span class="vj-user-marker-core"></span>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
});

const ROUTE_STYLES = {
  shadow: { color: '#041f1c', weight: 10, opacity: 0.12, lineCap: 'round' as const, lineJoin: 'round' as const },
  casing: { color: '#ffffff', weight: 7, opacity: 0.85, lineCap: 'round' as const, lineJoin: 'round' as const },
  main: { color: '#0d6b62', weight: 5, opacity: 0.95, lineCap: 'round' as const, lineJoin: 'round' as const },
  accent: { color: '#ff8555', weight: 2.5, opacity: 0.9, lineCap: 'round' as const, lineJoin: 'round' as const },
};

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
      map.fitBounds(bounds, { padding: [52, 52] });
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

function formatAccuracyMeters(meters: number) {
  if (meters < 1000) return `±${Math.round(meters)} m`;
  return `±${(meters / 1000).toFixed(1)} km`;
}

export default function LeafletMapView({
  locations,
  center = [21.0285, 105.8542],
  userLocation,
  userAccuracy,
  showRoute = false,
  routeCoordinates = [],
  onMapReady,
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
      <MapReadyBridge userLocation={userLocation} onMapReady={onMapReady} />

      {polyline.length >= 2 && (
        <>
          <Polyline positions={polyline.map(([lat, lng]) => ({ lat, lng }))} pathOptions={ROUTE_STYLES.shadow} />
          <Polyline positions={polyline.map(([lat, lng]) => ({ lat, lng }))} pathOptions={ROUTE_STYLES.casing} />
          <Polyline positions={polyline.map(([lat, lng]) => ({ lat, lng }))} pathOptions={ROUTE_STYLES.main} />
          <Polyline positions={polyline.map(([lat, lng]) => ({ lat, lng }))} pathOptions={ROUTE_STYLES.accent} />
        </>
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
        <>
          {userAccuracy && userAccuracy > 0 ? (
            <Circle
              center={{ lat: userLocation[0], lng: userLocation[1] }}
              radius={userAccuracy}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.1,
                weight: 1.5,
                opacity: 0.55,
              }}
            />
          ) : null}
          <Marker position={{ lat: userLocation[0], lng: userLocation[1] }} icon={userMarkerIcon}>
            <Popup>
              <div style={{ fontWeight: 700, color: '#0d6b62' }}>Vị trí của bạn</div>
              <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>
                {userLocation[0].toFixed(5)}, {userLocation[1].toFixed(5)}
              </div>
              {userAccuracy ? (
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.75 }}>
                  Độ chính xác: {formatAccuracyMeters(userAccuracy)}
                </div>
              ) : null}
            </Popup>
          </Marker>
        </>
      ) : null}
    </MapContainer>
  );
}
