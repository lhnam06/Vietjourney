import { useMemo, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Explore } from "./components/Explore";
import { ListPanel } from "./components/ListPanel";
import { MyTrips } from "./components/MyTrips";
import { Sidebar } from "./components/Sidebar";
import { getAuthToken } from "./lib/authApi";
import type { Place } from "./lib/placesApi";

export type AppView = "explore" | "trips";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [view, setView] = useState<AppView>("trips");
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

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar activeView={view} onNavigate={setView} />
      {view === "trips" ? (
        <MyTrips onExplore={() => setView("explore")} />
      ) : (
        <>
          <Explore savedPlaceIds={savedPlaceIds} onAddPlace={addPlace} />
          <ListPanel savedPlaces={savedPlaces} onRemovePlace={removePlace} />
        </>
      )}
    </div>
  );
}
