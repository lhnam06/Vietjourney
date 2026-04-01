import { MapPin, Navigation } from 'lucide-react';
import { Location } from '../data/mockData';
import GoogleMapView from './GoogleMapView';

interface SimpleMapProps {
  locations: Location[];
  center?: [number, number];
  showRoute?: boolean;
  routeCoordinates?: [number, number][];
}

// Format VND currency
const formatVND = (amount: number) => {
  if (amount === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  }).format(amount).replace(/\s?VND$/, ' VND');
};

export default function SimpleMap({ locations, center = [21.0285, 105.8542], showRoute = false, routeCoordinates = [] }: SimpleMapProps) {
  const googleKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (googleKey) {
    return (
      <GoogleMapView
        apiKey={googleKey}
        locations={locations}
        center={center}
        showRoute={showRoute}
        routeCoordinates={routeCoordinates}
      />
    );
  }

  if (locations.length === 0) {
    return (
      <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">Chưa có địa điểm để hiển thị</p>
          <p className="text-xs text-slate-500 mt-1">Thêm hoạt động vào lịch trình để xem lộ trình trên bản đồ.</p>
        </div>
      </div>
    );
  }

  // Calculate bounds to fit all locations
  const bounds = {
    minLat: Math.min(...locations.map(l => l.lat)),
    maxLat: Math.max(...locations.map(l => l.lat)),
    minLng: Math.min(...locations.map(l => l.lng)),
    maxLng: Math.max(...locations.map(l => l.lng)),
  };

  // Convert lat/lng to pixel coordinates (simplified projection)
  const latToY = (lat: number) => {
    const range = bounds.maxLat - bounds.minLat || 0.1;
    return ((bounds.maxLat - lat) / range) * 100;
  };

  const lngToX = (lng: number) => {
    const range = bounds.maxLng - bounds.minLng || 0.1;
    return ((lng - bounds.minLng) / range) * 100;
  };

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-slate-100 overflow-hidden">
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0A4A6E 1px, transparent 1px),
            linear-gradient(to bottom, #0A4A6E 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Map Attribution */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg z-10">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#0A4A6E]" />
          <span className="text-sm font-medium text-[#0A4A6E]">
            {locations.length} location{locations.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Route Lines */}
      {showRoute && routeCoordinates.length > 1 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-5">
          {routeCoordinates.map((coord, index) => {
            if (index === routeCoordinates.length - 1) return null;
            const nextCoord = routeCoordinates[index + 1];
            
            return (
              <line
                key={index}
                x1={`${lngToX(coord[1])}%`}
                y1={`${latToY(coord[0])}%`}
                x2={`${lngToX(nextCoord[1])}%`}
                y2={`${latToY(nextCoord[0])}%`}
                stroke="#FF6B35"
                strokeWidth="3"
                strokeDasharray="5,5"
                opacity="0.7"
              />
            );
          })}
        </svg>
      )}

      {/* Location Markers */}
      {locations.map((location, index) => {
        const x = lngToX(location.lng);
        const y = latToY(location.lat);

        return (
          <div
            key={location.id}
            className="absolute group cursor-pointer z-10"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {/* Marker Pin */}
            <div className="relative">
              <div className="w-8 h-8 bg-[#FF6B35] rounded-full border-4 border-white shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-125">
                {showRoute ? (
                  <span className="text-white text-xs font-bold">{index + 1}</span>
                ) : (
                  <MapPin className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-white absolute top-7 left-1/2 -translate-x-1/2" />
              
              {/* Popup on Hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48">
                <div className="bg-white rounded-lg shadow-xl p-3 border border-slate-200">
                  <h3 className="font-semibold text-sm text-slate-900 mb-1">{location.name}</h3>
                  <p className="text-xs text-slate-600 mb-2 line-clamp-2">{location.description}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1">
                      ⭐ {location.rating}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[#FF6B35] font-medium">{formatVND(location.price)}</span>
                  </div>
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white absolute top-full left-1/2 -translate-x-1/2" />
              </div>
            </div>
          </div>
        );
      })}

      {/* Center Indicator (optional) */}
      <div 
        className="absolute w-2 h-2 bg-[#0A4A6E] rounded-full opacity-30"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
    </div>
  );
}