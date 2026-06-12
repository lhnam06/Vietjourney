import { useMemo, useState } from "react";
import { Explore } from "./components/Explore";
import { ListPanel } from "./components/ListPanel";
import { Sidebar } from "./components/Sidebar";
import type { Place } from "./lib/placesApi";

export default function App() {
  const [savedPlaces, setSavedPlaces] = useState<Place[]>([]);
  const savedPlaceIds = useMemo(
    () => new Set(savedPlaces.map((place) => place.id)),
    [savedPlaces],
  );

  function addPlace(place: Place) {
    setSavedPlaces((currentPlaces) => {
      if (currentPlaces.some((currentPlace) => currentPlace.id === place.id)) {
        return currentPlaces;
      }

      return [place, ...currentPlaces];
    });
  }

  function removePlace(placeId: string) {
    setSavedPlaces((currentPlaces) =>
      currentPlaces.filter((place) => place.id !== placeId),
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar />
      <Explore savedPlaceIds={savedPlaceIds} onAddPlace={addPlace} />
      <ListPanel savedPlaces={savedPlaces} onRemovePlace={removePlace} />
    </div>
  );
}
