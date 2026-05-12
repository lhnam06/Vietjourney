import React from 'react';
import type { Location } from '../data/mockData';
import LeafletMapView from './LeafletMapView';

interface SimpleMapProps {
  locations: Location[];
  center?: [number, number];
  userLocation?: [number, number];
  showRoute?: boolean;
  routeCoordinates?: [number, number][];
  onAddToItinerary?: (location: Location) => void;
}

export default function SimpleMap({
  locations,
  center = [21.0285, 105.8542],
  userLocation,
  showRoute = false,
  routeCoordinates = [],
  onAddToItinerary,
}: SimpleMapProps) {
  return (
    <LeafletMapView
      locations={locations}
      center={center}
      userLocation={userLocation}
      showRoute={showRoute}
      routeCoordinates={routeCoordinates}
      onAddToItinerary={onAddToItinerary}
    />
  );
}
