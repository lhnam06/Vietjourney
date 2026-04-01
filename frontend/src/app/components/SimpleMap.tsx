import { Location } from '../data/mockData';
import GoogleMapView from './GoogleMapView';
import LeafletMapView from './LeafletMapView';

interface SimpleMapProps {
  locations: Location[];
  center?: [number, number];
  showRoute?: boolean;
  routeCoordinates?: [number, number][];
}

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

  return (
    <LeafletMapView
      locations={locations}
      center={center}
      showRoute={showRoute}
      routeCoordinates={routeCoordinates}
    />
  );
}