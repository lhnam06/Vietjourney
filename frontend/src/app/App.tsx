import { useMemo, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { Explore } from "./components/Explore";
import { ListPanel } from "./components/ListPanel";
import { MyTrips } from "./components/MyTrips";
import { Profile } from "./components/Profile";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { TimelineEditor } from "./components/TimelineEditor";
import { TripMapPage } from "./components/TripMapPage";
import { clearAuthToken, getAuthToken } from "./lib/authApi";
import type { Timeline } from "./lib/timelineApi";
import type { Place } from "./lib/placesApi";

export type AppView = "explore" | "trips" | "profile" | "settings" | "timeline-editor" | "trip-map";

export interface PlaceList {
  id: string;
  name: string;
  icon?: string;
  places: Place[];
}

const PLACE_LISTS_STORAGE_KEY = "vj:place-lists:v1";

function createDefaultPlaceList(): PlaceList {
  return {
    id: createListId(),
    name: "VietJourney",
    icon: "bookmark",
    places: [],
  };
}

function createListId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `list-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function loadPlaceLists() {
  if (typeof window === "undefined") return [createDefaultPlaceList()];

  try {
    const raw = window.localStorage.getItem(PLACE_LISTS_STORAGE_KEY);
    if (!raw) return [createDefaultPlaceList()];
    const parsed = JSON.parse(raw) as PlaceList[];
    const validLists = parsed
      .filter((list) => list.id && list.name && Array.isArray(list.places))
      .map((list) => ({ ...list, icon: list.icon || "bookmark" }));
    return validLists.length ? validLists : [createDefaultPlaceList()];
  } catch {
    return [createDefaultPlaceList()];
  }
}

function savePlaceLists(lists: PlaceList[]) {
  window.localStorage.setItem(PLACE_LISTS_STORAGE_KEY, JSON.stringify(lists));
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [view, setView] = useState<AppView>("trips");
  const [editingTimeline, setEditingTimeline] = useState<Timeline | null>(null);
  const [mapTimeline, setMapTimeline] = useState<Timeline | null>(null);
  const [placeLists, setPlaceLists] = useState<PlaceList[]>(loadPlaceLists);
  const [activeListId, setActiveListId] = useState(() => placeLists[0]?.id || "");
  const activeList = placeLists.find((list) => list.id === activeListId) || placeLists[0];
  const savedPlaces = activeList?.places || [];

  const savedPlaceIds = useMemo(
    () => new Set(savedPlaces.map((place) => place.id)),
    [savedPlaces],
  );

  function updatePlaceLists(updater: (lists: PlaceList[]) => PlaceList[]) {
    setPlaceLists((currentLists) => {
      const nextLists = updater(currentLists);
      const normalizedLists = nextLists.length ? nextLists : [createDefaultPlaceList()];
      savePlaceLists(normalizedLists);
      if (!normalizedLists.some((list) => list.id === activeListId)) {
        setActiveListId(normalizedLists[0].id);
      }
      return normalizedLists;
    });
  }

  function addPlace(place: Place) {
    updatePlaceLists((currentLists) => {
      const targetId = activeList?.id || currentLists[0]?.id;
      return currentLists.map((list) => {
        if (list.id !== targetId || list.places.some((currentPlace) => currentPlace.id === place.id)) {
          return list;
        }

        return { ...list, places: [place, ...list.places] };
      });
    });
  }

  function removePlace(placeId: string) {
    updatePlaceLists((currentLists) =>
      currentLists.map((list) =>
        list.id === activeList?.id
          ? { ...list, places: list.places.filter((place) => place.id !== placeId) }
          : list,
      ),
    );
  }

  function reorderPlace(placeId: string, targetPlaceId: string) {
    if (placeId === targetPlaceId) return;

    updatePlaceLists((currentLists) =>
      currentLists.map((list) => {
        if (list.id !== activeList?.id) return list;
        const fromIndex = list.places.findIndex((place) => place.id === placeId);
        const toIndex = list.places.findIndex((place) => place.id === targetPlaceId);
        if (fromIndex < 0 || toIndex < 0) return list;

        const nextPlaces = [...list.places];
        const [movedPlace] = nextPlaces.splice(fromIndex, 1);
        nextPlaces.splice(toIndex, 0, movedPlace);
        return { ...list, places: nextPlaces };
      }),
    );
  }

  function createPlaceList(name: string, icon = "bookmark") {
    const nextList = {
      id: createListId(),
      name,
      icon,
      places: [],
    };
    updatePlaceLists((currentLists) => [nextList, ...currentLists]);
    setActiveListId(nextList.id);
  }

  function renameActiveList(name: string) {
    updatePlaceLists((currentLists) =>
      currentLists.map((list) => (list.id === activeList?.id ? { ...list, name } : list)),
    );
  }

  function duplicateActiveList() {
    if (!activeList) return;

    const nextList = {
      id: createListId(),
      name: `${activeList.name} copy`,
      places: activeList.places,
    };
    updatePlaceLists((currentLists) => [nextList, ...currentLists]);
    setActiveListId(nextList.id);
  }

  function clearActiveList() {
    updatePlaceLists((currentLists) =>
      currentLists.map((list) => (list.id === activeList?.id ? { ...list, places: [] } : list)),
    );
  }

  function deleteActiveList() {
    if (!activeList || placeLists.length <= 1) return;

    updatePlaceLists((currentLists) => currentLists.filter((list) => list.id !== activeList.id));
  }

  function logout() {
    clearAuthToken();
    setEditingTimeline(null);
    setMapTimeline(null);
    setView("trips");
    setIsAuthenticated(false);
  }

  function openTimelineEditor(timeline: Timeline) {
    setMapTimeline(null);
    setEditingTimeline(timeline);
    setView("timeline-editor");
  }

  function openTripMap(timeline: Timeline) {
    setEditingTimeline(null);
    setMapTimeline(timeline);
    setView("trip-map");
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
          placeLists={placeLists}
          activeListId={activeList?.id || ""}
          onSelectList={setActiveListId}
          onCreateList={createPlaceList}
          onBack={() => {
            setEditingTimeline(null);
            setView("trips");
          }}
        />
      ) : view === "trip-map" && mapTimeline ? (
        <TripMapPage
          timeline={mapTimeline}
          onBack={() => {
            setMapTimeline(null);
            setView("trips");
          }}
        />
      ) : view === "trips" ? (
        <MyTrips
          onExplore={() => setView("explore")}
          onEditTimeline={openTimelineEditor}
          onViewMap={openTripMap}
        />
      ) : view === "profile" ? (
        <Profile
          savedPlaces={savedPlaces}
          onExplore={() => setView("explore")}
          onEditTimeline={openTimelineEditor}
        />
      ) : view === "settings" ? (
        <SettingsPage />
      ) : (
        <>
          <Explore savedPlaceIds={savedPlaceIds} onAddPlace={addPlace} />
          <ListPanel
            lists={placeLists}
            activeListId={activeList?.id || ""}
            onSelectList={setActiveListId}
            onCreateList={createPlaceList}
            onRenameList={renameActiveList}
            onDuplicateList={duplicateActiveList}
            onClearList={clearActiveList}
            onDeleteList={deleteActiveList}
            onAddPlace={addPlace}
            onRemovePlace={removePlace}
            onReorderPlace={reorderPlace}
            onOpenTrips={() => setView("trips")}
          />
        </>
      )}
    </div>
  );
}
