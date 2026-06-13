import { useMemo, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Explore } from "./components/Explore";
import { ListPanel } from "./components/ListPanel";
import { MyTrips } from "./components/MyTrips";
import { Sidebar } from "./components/Sidebar";
import { TimelineEditor } from "./components/TimelineEditor";
import { clearAuthToken, getAuthToken } from "./lib/authApi";
import type { Timeline } from "./lib/timelineApi";
import type { Place } from "./lib/placesApi";

export type AppView = "explore" | "trips" | "timeline-editor";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [view, setView] = useState<AppView>("trips");
  const [editingTimeline, setEditingTimeline] = useState<Timeline | null>(null);
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

  function logout() {
    clearAuthToken();
    setSavedPlaces([]);
    setEditingTimeline(null);
    setView("trips");
    setIsAuthenticated(false);
  }

  function openTimelineEditor(timeline: Timeline) {
    setEditingTimeline(timeline);
    setView("timeline-editor");
  }

  if (!isAuthenticated) {
    return <AuthPage onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar activeView={view} onNavigate={setView} onLogout={logout} />
      {view === "timeline-editor" && editingTimeline ? (
        <TimelineEditor
          timeline={editingTimeline}
          onBack={() => {
            setEditingTimeline(null);
            setView("trips");
          }}
        />
      ) : view === "trips" ? (
        <MyTrips onExplore={() => setView("explore")} onEditTimeline={openTimelineEditor} />
      ) : (
        <>
          <Explore savedPlaceIds={savedPlaceIds} onAddPlace={addPlace} />
          <ListPanel savedPlaces={savedPlaces} onRemovePlace={removePlace} />
        </>
      )}
    </div>
  );
}
