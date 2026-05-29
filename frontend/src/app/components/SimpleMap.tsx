import type { Location } from '../types/domain';
import LeafletMapView, { type LeafletMapApi } from './LeafletMapView';

interface SimpleMapProps {
  locations: Location[];
  center?: [number, number];
  userLocation?: [number, number];
  userAccuracy?: number;
  showRoute?: boolean;
  routeCoordinates?: [number, number][];
  onMapReady?: (api: LeafletMapApi) => void;
}

export default function SimpleMap({
  locations,
  center = [21.0285, 105.8542],
  userLocation,
  userAccuracy,
  showRoute = false,
  routeCoordinates = [],
  onMapReady,
}: SimpleMapProps) {
  return (
    <LeafletMapView
      locations={locations}
      center={center}
      userLocation={userLocation}
      userAccuracy={userAccuracy}
      showRoute={showRoute}
      routeCoordinates={routeCoordinates}
      onMapReady={onMapReady}
    />
  );
}
