import type { Location } from '../types/domain';

const SAVED_PLACES_KEY_PREFIX = 'vj:workspace:saved-places';

export function getSavedPlaces(tripId?: string): Location[] {
  const key = tripId ? `${SAVED_PLACES_KEY_PREFIX}:${tripId}` : SAVED_PLACES_KEY_PREFIX;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Failed to get saved places', err);
    return [];
  }
}

export function savePlace(location: Location, tripId?: string): void {
  const key = tripId ? `${SAVED_PLACES_KEY_PREFIX}:${tripId}` : SAVED_PLACES_KEY_PREFIX;
  const current = getSavedPlaces(tripId);
  if (!current.find((loc) => loc.id === location.id)) {
    const updated = [location, ...current];
    try {
      localStorage.setItem(key, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save place', err);
    }
  }
}

export function removeSavedPlace(id: string, tripId?: string): void {
  const key = tripId ? `${SAVED_PLACES_KEY_PREFIX}:${tripId}` : SAVED_PLACES_KEY_PREFIX;
  const current = getSavedPlaces(tripId);
  const updated = current.filter((loc) => loc.id !== id);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to remove saved place', err);
  }
}
