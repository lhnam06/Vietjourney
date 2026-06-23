import { useEffect, useMemo, useState } from "react";
import { AuthPage } from "./components/AuthPage";
import { CommunityPage } from "./components/CommunityPage";
import { Explore } from "./components/Explore";
import { ListPanel } from "./components/ListPanel";
import { MyTrips } from "./components/MyTrips";
import { NotificationPage } from "./components/NotificationPage";
import { Profile } from "./components/Profile";
import { SettingsPage } from "./components/SettingsPage";
import { Sidebar } from "./components/Sidebar";
import { TimelineEditor } from "./components/TimelineEditor";
import { TripMapPage } from "./components/TripMapPage";
import LandingPage from "./components/landing/LandingPage";
import { clearAuthToken, getAuthToken } from "./lib/authApi";
import { fetchCurrentUser, type CurrentUser, type Timeline } from "./lib/timelineApi";
import type { Place } from "./lib/placesApi";

export type AppView = "explore" | "trips" | "community" | "profile" | "settings" | "notifications" | "timeline-editor" | "trip-map";

export interface PlaceList {
  id: string;
  name: string;
  icon?: string;
  places: Place[];
}

const PLACE_LISTS_STORAGE_KEY = "vj:place-lists:v1";
const ACTIVE_VIEW_STORAGE_KEY = "vj:active-view:v1";
const PERSISTABLE_VIEWS: AppView[] = ["explore", "trips", "community", "profile", "settings", "notifications"];
const PROTECTED_VIEWS: AppView[] = ["trips", "profile", "settings", "notifications", "timeline-editor", "trip-map"];

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

function loadActiveView(): AppView {
  if (typeof window === "undefined") return "trips";

  const storedView = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
  return PERSISTABLE_VIEWS.includes(storedView as AppView) ? (storedView as AppView) : "trips";
}

function saveActiveView(view: AppView) {
  if (typeof window === "undefined") return;

  if (PERSISTABLE_VIEWS.includes(view)) {
    window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, view);
  }
}

export default function App() {
  const [hasInitialToken] = useState(() => Boolean(getAuthToken()));
  const [isAuthenticated, setIsAuthenticated] = useState(hasInitialToken);
  const [isCheckingAuth, setIsCheckingAuth] = useState(hasInitialToken);
  const [showAuthPage, setShowAuthPage] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [showLandingPage, setShowLandingPage] = useState(!hasInitialToken);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [view, setView] = useState<AppView>(() => (hasInitialToken ? loadActiveView() : "explore"));
  const [editingTimeline, setEditingTimeline] = useState<Timeline | null>(null);
  const [mapTimeline, setMapTimeline] = useState<Timeline | null>(null);
  const [mapReturnView, setMapReturnView] = useState<AppView>("trips");
  const [placeLists, setPlaceLists] = useState<PlaceList[]>(loadPlaceLists);
  const [activeListId, setActiveListId] = useState(() => placeLists[0]?.id || "");
  const activeList = placeLists.find((list) => list.id === activeListId) || placeLists[0];
  const savedPlaces = activeList?.places || [];

  const savedPlaceIds = useMemo(
    () => new Set(savedPlaces.map((place) => place.id)),
    [savedPlaces],
  );

  useEffect(() => {
    saveActiveView(view);
  }, [view]);

  useEffect(() => {
    if (!hasInitialToken) return;

    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((user) => {
        setCurrentUser(user);
        setIsAuthenticated(true);
      })
      .catch(() => {
        if (controller.signal.aborted) return;

        clearAuthToken();
        window.localStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
        setCurrentUser(null);
        setIsAuthenticated(false);
        setEditingTimeline(null);
        setMapTimeline(null);
        setView("explore");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsCheckingAuth(false);
        }
      });

    return () => controller.abort();
  }, [hasInitialToken]);

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
    window.localStorage.removeItem(ACTIVE_VIEW_STORAGE_KEY);
    setCurrentUser(null);
    setEditingTimeline(null);
    setMapTimeline(null);
    setShowAuthPage(false);
    setView("explore");
    setIsAuthenticated(false);
  }

  function openLogin() {
    setAuthMode("login");
    setShowAuthPage(true);
  }

  function openRegister() {
    setAuthMode("signup");
    setShowAuthPage(true);
  }

  function navigate(nextView: AppView) {
    if (!isAuthenticated && PROTECTED_VIEWS.includes(nextView)) {
      setAuthMode("login");
      setShowAuthPage(true);
      return;
    }

    setView(nextView);
  }

  async function completeAuthentication() {
    setIsAuthenticated(true);
    setShowAuthPage(false);
    setShowLandingPage(false);
    setView("trips");

    try {
      const user = await fetchCurrentUser();
      setCurrentUser(user);
    } catch {
      setCurrentUser(null);
    }
  }

  function openTimelineEditor(timeline: Timeline) {
    setMapTimeline(null);
    setEditingTimeline(timeline);
    setView("timeline-editor");
  }

  function openTripMap(timeline: Timeline) {
    setEditingTimeline(null);
    setMapTimeline(timeline);
    setMapReturnView("trips");
    setView("trip-map");
  }

  if (showAuthPage) {
    return <AuthPage initialMode={authMode} onAuthenticated={() => void completeAuthentication()} />;
  }

  if (isCheckingAuth) {
    return <AuthLoading />;
  }

  if (showLandingPage) {
    return (
      <LandingPage
        isAuthenticated={isAuthenticated}
        onStartPlanning={() => {
          if (isAuthenticated) {
            setView("trips");
            setShowLandingPage(false);
          } else {
            openLogin();
          }
        }}
        onExplore={() => {
          setView("explore");
          setShowLandingPage(false);
        }}
        onCommunity={() => {
          setView("community");
          setShowLandingPage(false);
        }}
        onLogin={openLogin}
        onRegister={openRegister}
      />
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <Sidebar
        activeView={view}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
        onNavigate={navigate}
        onLogin={openLogin}
        onLogout={logout}
        onLogoClick={() => setShowLandingPage(true)}
      />
      {view === "timeline-editor" && editingTimeline ? (
        <TimelineEditor
          timeline={editingTimeline}
          currentUser={currentUser}
          placeLists={placeLists}
          activeListId={activeList?.id || ""}
          onSelectList={setActiveListId}
          onCreateList={createPlaceList}
          onBack={() => {
            setEditingTimeline(null);
            setView("trips");
          }}
          onViewMap={() => {
            if (editingTimeline) {
              setMapTimeline(editingTimeline);
              setMapReturnView("timeline-editor");
              setView("trip-map");
            }
          }}
        />
      ) : view === "trip-map" && mapTimeline ? (
        <TripMapPage
          timeline={mapTimeline}
          onBack={() => {
            setMapTimeline(null);
            setView(mapReturnView);
          }}
        />
      ) : view === "trips" ? (
        <MyTrips
          savedPlaces={savedPlaces}
          onExplore={() => setView("explore")}
          onOpenNotifications={() => setView("notifications")}
          onEditTimeline={openTimelineEditor}
          onViewMap={openTripMap}
        />
      ) : view === "notifications" ? (
        <NotificationPage
          onOpenTrips={() => setView("trips")}
          onOpenTimeline={openTimelineEditor}
        />
      ) : view === "community" ? (
        <CommunityPage onOpenTimeline={openTimelineEditor} isAuthenticated={isAuthenticated} onLogin={openLogin} />
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

function AuthLoading() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background text-foreground">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm font-medium text-muted-foreground shadow-sm">
        <span className="size-3 animate-pulse rounded-full bg-primary" />
        Đang kiểm tra đăng nhập...
      </div>
    </main>
  );
}
