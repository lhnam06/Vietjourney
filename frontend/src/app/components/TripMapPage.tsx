import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronsRight,
  Clock3,
  Info,
  Layers,
  List,
  Loader2,
  MapPinned,
  Route,
  X,
} from "lucide-react";
import L, { type LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  ScaleControl,
  TileLayer,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  fetchTimelineEvents,
  type Timeline,
  type TimelineEvent,
  type TimelineEventCategory,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";

interface TripMapPageProps {
  timeline: Timeline;
  onBack: () => void;
}

type MapLayer = "street" | "satellite" | "terrain" | "traffic";
type DayDirection = "next" | "prev";

interface MappedEvent extends TimelineEvent {
  coordinate: [number, number];
}

interface OsrmRouteResult {
  routes?: Array<{
    distance: number;
    duration: number;
    geometry?: {
      coordinates?: [number, number][];
    };
  }>;
}

interface RouteState {
  path: [number, number][];
  distanceKm: number;
  durationMinutes: number;
  loading: boolean;
  error: string | null;
}

const fallbackCoordinates: [number, number][] = [
  [10.7769, 106.7009],
  [10.7798, 106.699],
  [10.7831, 106.7042],
  [10.7717, 106.7049],
  [10.7871, 106.701],
  [10.7722, 106.6981],
];

const categoryTone: Record<TimelineEventCategory, string> = {
  FOOD: "bg-emerald-500/12 text-emerald-500",
  DRINK: "bg-indigo-500/12 text-indigo-500",
  ACTIVITY: "bg-orange-500/12 text-orange-500",
};

const tileLayers: Record<MapLayer, { url: string; attribution: string }> = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenTopoMap",
  },
  traffic: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap &copy; CARTO",
  },
};

const layerOptions: Array<{
  value: MapLayer;
  label: string;
  preview: string;
}> = [
  {
    value: "street",
    label: "Mặc định",
    preview:
      "https://a.basemaps.cartocdn.com/light_all/14/13046/7624.png",
  },
  {
    value: "satellite",
    label: "Vệ tinh",
    preview:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/14/7624/13046",
  },
  {
    value: "terrain",
    label: "Địa hình",
    preview: "https://a.tile.opentopomap.org/14/13046/7624.png",
  },
  {
    value: "traffic",
    label: "Giao thông",
    preview:
      "https://a.basemaps.cartocdn.com/rastertiles/voyager/14/13046/7624.png",
  },
];

const osrmRouteEndpoint = "https://router.project-osrm.org/route/v1/driving";

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toDateTimeInput(date: Date, hour = 0, minute = 0) {
  return `${toDateInput(date)}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

function dayCount(startDate: string, endDate: string) {
  const start = dateOnly(startDate).getTime();
  const end = dateOnly(endDate).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatTimeRange(event: TimelineEvent) {
  return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
}

function categoryLabel(category: TimelineEventCategory) {
  switch (category) {
    case "FOOD":
      return "Ẩm thực";
    case "DRINK":
      return "Đồ uống";
    case "ACTIVITY":
      return "Trải nghiệm";
    default:
      return "Địa điểm";
  }
}

function eventImage(event: TimelineEvent) {
  return event.place?.imageUrl || `https://picsum.photos/seed/${encodeURIComponent(event.id)}/160/120`;
}

function eventDistrict(event: TimelineEvent) {
  return event.place?.district || event.place?.address || "Điểm đến";
}

function markerIcon(index: number) {
  return L.divIcon({
    html: `<span>${index + 1}</span>`,
    className: "vj-map-marker",
    iconSize: [32, 40],
    iconAnchor: [16, 34],
    popupAnchor: [0, -34],
    tooltipAnchor: [0, -30],
  });
}

function hasCoordinates(event: TimelineEvent) {
  return event.place?.latitude != null && event.place.longitude != null;
}

function mapEvents(events: TimelineEvent[]) {
  return events
    .slice()
    .sort((first, second) => new Date(first.startTime).getTime() - new Date(second.startTime).getTime())
    .map((event, index) => {
      const coordinate: [number, number] = hasCoordinates(event)
        ? [event.place?.latitude as number, event.place?.longitude as number]
        : fallbackCoordinates[index % fallbackCoordinates.length];

      return { ...event, coordinate };
    });
}

function distanceKm(points: [number, number][]) {
  if (points.length < 2) return 0;

  return points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    const toRad = (value: number) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(point[0] - previous[0]);
    const dLng = toRad(point[1] - previous[1]);
    const lat1 = toRad(previous[0]);
    const lat2 = toRad(point[0]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return total + earthRadiusKm * c;
  }, 0);
}

function estimateTravelMinutes(distance: number) {
  return Math.max(0, Math.round((distance / 12) * 60));
}

async function fetchOsrmRoute(points: [number, number][], signal?: AbortSignal) {
  if (points.length < 2) {
    return {
      path: points,
      distanceKm: 0,
      durationMinutes: 0,
    };
  }

  const coordinates = points
    .map(([latitude, longitude]) => `${longitude},${latitude}`)
    .join(";");
  const params = new URLSearchParams({
    overview: "full",
    geometries: "geojson",
    steps: "false",
  });
  const response = await fetch(`${osrmRouteEndpoint}/${coordinates}?${params.toString()}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error(`Không tìm được tuyến đường (${response.status})`);
  }

  const payload = (await response.json()) as OsrmRouteResult;
  const route = payload.routes?.[0];
  const geometry = route?.geometry?.coordinates;

  if (!route || !geometry?.length) {
    throw new Error("OSRM không trả về tuyến đường hợp lệ.");
  }

  return {
    path: geometry.map(([longitude, latitude]) => [latitude, longitude] as [number, number]),
    distanceKm: route.distance / 1000,
    durationMinutes: Math.max(1, Math.round(route.duration / 60)),
  };
}

function FitRoute({ points }: { points: LatLngExpression[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      map.fitBounds(L.latLngBounds(points), { padding: [80, 80], maxZoom: 15 });
      return;
    }

    if (points.length === 1) {
      map.setView(points[0], 15);
    }
  }, [map, points]);

  return null;
}

function MapResizeWatcher({ layoutKey }: { layoutKey: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(() => {
            map.invalidateSize({ animate: true });
          });

    observer?.observe(container);

    const timeouts = [0, 160, 320].map((delay) =>
      window.setTimeout(() => {
        map.invalidateSize({ animate: true });
      }, delay),
    );

    return () => {
      observer?.disconnect();
      timeouts.forEach(window.clearTimeout);
    };
  }, [layoutKey, map]);

  return null;
}

function MapInteractionHandler({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: onMapClick,
  });

  return null;
}

export function TripMapPage({ timeline, onBack }: TripMapPageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(timeline.events);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [dayDirection, setDayDirection] = useState<DayDirection>("next");
  const [layer, setLayer] = useState<MapLayer>("street");
  const [showPlaces, setShowPlaces] = useState(true);
  const [tripPanelCollapsed, setTripPanelCollapsed] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);
  const [routeSummaryOpen, setRouteSummaryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeState, setRouteState] = useState<RouteState>({
    path: [],
    distanceKm: 0,
    durationMinutes: 0,
    loading: false,
    error: null,
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const collapsedDayRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const expandedDayRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const days = useMemo(
    () =>
      Array.from(
        { length: dayCount(timeline.startDate, timeline.endDate) },
        (_, index) => addDays(dateOnly(timeline.startDate), index),
      ),
    [timeline.endDate, timeline.startDate],
  );
  const selectedDay = days[selectedDayIndex] || days[0] || dateOnly(timeline.startDate);
  const selectedDate = toDateInput(selectedDay);
  const dayEvents = useMemo(
    () => events.filter((event) => event.startTime.slice(0, 10) === selectedDate),
    [events, selectedDate],
  );
  const mappedEvents = useMemo(() => mapEvents(dayEvents), [dayEvents]);
  const routePoints = useMemo(() => mappedEvents.map((event) => event.coordinate), [mappedEvents]);
  const routePolyline = routeState.path.length ? routeState.path : routePoints;
  const center = routePoints[0] || fallbackCoordinates[0];
  const totalDistance = routeState.distanceKm || distanceKm(routePoints);
  const travelMinutes = routeState.durationMinutes || estimateTravelMinutes(totalDistance);
  const currentTileLayer = tileLayers[layer];

  function handleSelectDay(nextDayIndex: number) {
    if (nextDayIndex === selectedDayIndex) return;
    setDayDirection(nextDayIndex > selectedDayIndex ? "next" : "prev");
    setSelectedDayIndex(nextDayIndex);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      setLoading(true);
      setError(null);
      try {
        const nextEvents = await fetchTimelineEvents(
          timeline.id,
          toDateTimeInput(dateOnly(timeline.startDate)),
          toDateTimeInput(addDays(dateOnly(timeline.endDate), 1)),
          controller.signal,
        );
        setEvents(nextEvents);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Không tải được bản đồ chuyến đi.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadEvents();
    return () => controller.abort();
  }, [timeline.endDate, timeline.id, timeline.startDate]);

  useEffect(() => {
    const controller = new AbortController();
    const fallbackDistance = distanceKm(routePoints);

    if (routePoints.length < 2) {
      setRouteState({
        path: routePoints,
        distanceKm: fallbackDistance,
        durationMinutes: estimateTravelMinutes(fallbackDistance),
        loading: false,
        error: null,
      });
      return () => controller.abort();
    }

    async function loadRoute() {
      setRouteState((current) => ({
        ...current,
        path: routePoints,
        loading: true,
        error: null,
      }));

      try {
        const route = await fetchOsrmRoute(routePoints, controller.signal);
        setRouteState({
          ...route,
          loading: false,
          error: null,
        });
      } catch (routeError) {
        if (!controller.signal.aborted) {
          setRouteState({
            path: routePoints,
            distanceKm: fallbackDistance,
            durationMinutes: estimateTravelMinutes(fallbackDistance),
            loading: false,
            error: routeError instanceof Error ? routeError.message : "Không tìm được tuyến đường.",
          });
        }
      }
    }

    loadRoute();
    return () => controller.abort();
  }, [routePoints]);

  useEffect(() => {
    if (selectedDayIndex > days.length - 1) {
      setSelectedDayIndex(Math.max(days.length - 1, 0));
    }
  }, [days.length, selectedDayIndex]);

  useEffect(() => {
    setSelectedDayIndex(0);
    setDayDirection("next");
  }, [timeline.id]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);

    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    const behavior = prefersReducedMotion ? "auto" : "smooth";
    collapsedDayRefs.current[selectedDayIndex]?.scrollIntoView({
      behavior,
      block: "center",
      inline: "nearest",
    });
    expandedDayRefs.current[selectedDayIndex]?.scrollIntoView({
      behavior,
      block: "nearest",
      inline: "center",
    });
  }, [prefersReducedMotion, selectedDayIndex]);

  useEffect(() => {
    if (!layerMenuOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setLayerMenuOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [layerMenuOpen]);

  return (
    <main className="h-dvh min-w-0 flex-1 overflow-hidden bg-background px-4 py-4 lg:px-6">
      <div className="mx-auto flex h-full max-w-[1500px] flex-col">
        <header className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={onBack}
              className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground"
              aria-label="Quay lại chuyến đi của tôi"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Bản đồ chuyến đi</h1>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Xem lộ trình, địa điểm đã lưu và tối ưu di chuyển trong ngày.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTipsOpen(true)}
            className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 sm:flex"
          >
            <Info className="size-4 text-primary" />
            Mẹo sử dụng
          </button>
        </header>

        <div
          className={cn(
            "grid min-h-0 flex-1 gap-4 transition-[grid-template-columns] duration-300 ease-out",
            tripPanelCollapsed
              ? "xl:grid-cols-[104px_minmax(0,1fr)]"
              : "xl:grid-cols-[minmax(440px,500px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(500px,560px)_minmax(0,1fr)]",
          )}
        >
          <aside
            className={cn(
              "relative min-h-0 overflow-hidden rounded-[24px] border border-border bg-card p-3 shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition-[padding,box-shadow,border-radius] duration-300 ease-out sm:p-4",
              tripPanelCollapsed
                ? "shadow-[0_18px_48px_rgba(15,23,42,0.08)]"
                : "shadow-[0_24px_70px_rgba(15,23,42,0.1)]",
            )}
          >
            <button
              type="button"
              onClick={() => setTripPanelCollapsed((current) => !current)}
              aria-label={tripPanelCollapsed ? "Mở rộng thanh chuyến đi" : "Thu hẹp thanh chuyến đi"}
              aria-expanded={!tripPanelCollapsed}
              className={cn(
                "absolute z-20 flex size-12 items-center justify-center rounded-2xl bg-card/88 text-primary shadow-[0_14px_34px_rgba(15,23,42,0.08)] backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                tripPanelCollapsed
                  ? "left-1/2 top-4 -translate-x-1/2"
                  : "right-3 top-3",
              )}
            >
              <ChevronsRight
                className={cn(
                  "size-6 transition-transform duration-300 ease-out",
                  tripPanelCollapsed ? "rotate-0" : "rotate-180",
                )}
              />
            </button>

            <div className="relative h-full min-h-[520px]">
              <div
                aria-hidden={!tripPanelCollapsed}
                className={cn(
                  "trip-panel-stage trip-panel-stage-collapsed",
                  tripPanelCollapsed ? "trip-panel-stage-active" : "trip-panel-stage-inactive",
                )}
              >
                <div className="trip-panel-scroll flex min-h-0 w-full flex-1 flex-col items-center gap-4 overflow-y-auto overflow-x-visible px-1 pb-4 pt-20">
                  {days.map((day, dayIndex) => {
                    const selected = dayIndex === selectedDayIndex;

                    return (
                      <button
                        key={`collapsed-${toDateInput(day)}`}
                        ref={(element) => {
                          collapsedDayRefs.current[dayIndex] = element;
                        }}
                        type="button"
                        onClick={() => handleSelectDay(dayIndex)}
                        aria-label={`Ngày ${dayIndex + 1}`}
                        tabIndex={tripPanelCollapsed ? 0 : -1}
                        className={cn(
                          "relative flex shrink-0 items-center justify-center rounded-[28px] text-center transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                          selected
                            ? "h-[76px] w-[76px] -translate-y-0.5 bg-primary/12 text-primary shadow-[0_16px_34px_rgba(91,77,241,0.18)]"
                            : "h-[56px] w-[56px] bg-card text-muted-foreground shadow-[0_10px_22px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 hover:text-primary",
                        )}
                      >
                        <span
                          className={cn(
                            "absolute -left-3.5 w-1 rounded-full bg-primary transition-all duration-300 ease-out",
                            selected ? "h-12 opacity-100" : "h-4 opacity-0",
                          )}
                        />
                        <span className="leading-none">
                          <span
                            className={cn(
                              "block overflow-hidden text-[10px] font-bold uppercase tracking-[0.16em] transition-all duration-300 ease-out",
                              selected ? "max-h-4 opacity-100" : "max-h-0 opacity-0",
                            )}
                          >
                            Ngày
                          </span>
                          <span
                            className={cn(
                              "mt-0.5 block font-semibold tabular-nums transition-all duration-300 ease-out",
                              selected ? "text-3xl" : "text-2xl",
                            )}
                          >
                            {dayIndex + 1}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                aria-hidden={tripPanelCollapsed}
                className={cn(
                  "trip-panel-stage trip-panel-stage-expanded",
                  tripPanelCollapsed ? "trip-panel-stage-inactive" : "trip-panel-stage-active",
                )}
              >
                <div className="trip-panel-scroll flex min-h-0 flex-1 flex-col overflow-y-auto pr-1">
                  <div className="space-y-4 pt-14">
                    <div>
                      <p className="pr-12 text-sm font-semibold text-muted-foreground">Chuyến đi đang xem</p>
                      <div className="mt-3 flex min-w-0 items-center gap-3 rounded-[26px] border border-border bg-card px-4 py-4 shadow-sm">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                          <CalendarDays className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold text-foreground">
                            {timeline.title || "Chuyến đi chưa đặt tên"}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatShortDate(days[0] || dateOnly(timeline.startDate))} - {formatShortDate(days[days.length - 1] || dateOnly(timeline.endDate))}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Ngày</p>
                      <div className="trip-day-viewport trip-panel-scroll mt-3 flex gap-3 overflow-x-auto pb-1">
                        {days.map((day, dayIndex) => {
                          const selected = dayIndex === selectedDayIndex;

                          return (
                            <button
                              key={toDateInput(day)}
                              ref={(element) => {
                                expandedDayRefs.current[dayIndex] = element;
                              }}
                              type="button"
                              onClick={() => handleSelectDay(dayIndex)}
                              tabIndex={tripPanelCollapsed ? -1 : 0}
                              className={cn(
                                "flex min-h-[74px] min-w-[112px] shrink-0 flex-col items-center justify-center rounded-[24px] border px-3 py-2.5 text-[13px] font-semibold tabular-nums transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                                selected
                                  ? "-translate-y-0.5 border-transparent bg-gradient-to-br from-[#5146f2] to-[#7b61ff] text-white shadow-[0_18px_32px_rgba(91,77,241,0.24)]"
                                  : "border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:border-primary/30",
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <CalendarDays
                                  className={cn(
                                    "transition-all duration-300 ease-out",
                                    selected ? "size-5 opacity-100" : "size-4 opacity-60",
                                  )}
                                />
                                Ngày {dayIndex + 1}
                              </span>
                              <span
                                className={cn(
                                  "mt-1 flex items-center gap-1.5 overflow-hidden text-xs font-medium transition-all duration-300 ease-out",
                                  selected
                                    ? "max-h-5 translate-y-0 opacity-100 text-white/90"
                                    : "max-h-0 translate-y-1 opacity-0 text-transparent",
                                )}
                              >
                                <Clock3 className="size-3.5" />
                                {formatShortDate(day)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div
                      key={selectedDate}
                      className={cn(
                        "trip-day-content-stage space-y-4",
                        dayDirection === "next" ? "trip-day-content-next" : "trip-day-content-prev",
                      )}
                    >
                      <section>
                        <h2 className="text-sm font-semibold text-muted-foreground">Tổng quan ngày {selectedDayIndex + 1}</h2>
                        <div className="mt-2 grid grid-cols-3 divide-x divide-border rounded-2xl bg-muted/35 px-3 py-3">
                          <SummaryPill icon={MapPinned} value={mappedEvents.length} label="địa điểm" tone="text-primary bg-primary/10" />
                          <SummaryPill icon={Route} value={totalDistance.toFixed(1)} label="km" tone="text-blue-500 bg-blue-500/10" />
                          <SummaryPill icon={Clock3} value={travelMinutes} label="phút" tone="text-green-600 bg-green-500/12" />
                        </div>
                      </section>

                      {error ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                          {error}
                        </div>
                      ) : null}

                      <section>
                        <div className="flex items-center justify-between">
                          <h2 className="text-lg font-bold text-foreground">Lộ trình hôm nay</h2>
                          {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
                        </div>

                        <div className="mt-3">
                          {mappedEvents.length ? (
                            <div className="max-h-[280px] space-y-3 overflow-y-auto pr-1">
                              {mappedEvents.map((event, index) => (
                                <RouteListItem key={event.id} event={event} index={index} />
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-border bg-card px-5 py-6 text-center shadow-sm">
                              <div className="mx-auto flex size-20 items-center justify-center rounded-[24px] bg-accent text-primary">
                                <MapPinned className="size-11" />
                              </div>
                              <p className="mt-4 text-lg font-bold text-foreground">Chưa có điểm đến</p>
                              <p className="mx-auto mt-2 max-w-[260px] text-sm font-medium leading-6 text-muted-foreground">
                                Thêm địa điểm từ Timeline để xem tuyến đường trên bản đồ.
                              </p>
                              <button
                                type="button"
                                className="mx-auto mt-5 flex min-h-12 w-full max-w-[210px] items-center justify-center gap-3 rounded-2xl border-2 border-primary bg-card px-5 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-accent"
                              >
                                <List className="size-5" />
                                Mở Timeline
                              </button>
                            </div>
                          )}
                        </div>

                        {routeState.loading ? (
                          <p className="mt-3 flex items-center gap-2 text-xs font-medium text-primary">
                            <Loader2 className="size-3.5 animate-spin" />
                            Đang tính tuyến đường theo OpenStreetMap...
                          </p>
                        ) : routeState.error ? (
                          <p className="mt-3 text-xs text-muted-foreground">
                            Router tạm thời không phản hồi, đang hiển thị tuyến nối nhanh.
                          </p>
                        ) : null}
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <section className="min-h-0 min-w-0">
            <div className="relative h-full min-h-[520px] overflow-hidden rounded-[24px] border border-border bg-card shadow-sm">
              <MapContainer
                center={center}
                zoom={14}
                zoomControl={false}
                attributionControl={false}
                className="h-full w-full"
                scrollWheelZoom
              >
                <TileLayer key={layer} attribution={currentTileLayer.attribution} url={currentTileLayer.url} />
                <ZoomControl position="topleft" />
                <ScaleControl position="bottomleft" imperial metric />
                <FitRoute points={routePolyline.length ? routePolyline : routePoints} />
                <MapResizeWatcher layoutKey={tripPanelCollapsed ? "collapsed" : "expanded"} />
                <MapInteractionHandler onMapClick={() => setLayerMenuOpen(false)} />
                {routePolyline.length >= 2 ? (
                  <Polyline
                    positions={routePolyline}
                    pathOptions={{ color: "#5b4df1", weight: 5, opacity: 0.7, lineCap: "round", lineJoin: "round" }}
                  />
                ) : null}
                {showPlaces
                  ? mappedEvents.map((event, index) => (
                      <Marker key={event.id} position={event.coordinate} icon={markerIcon(index)}>
                        <Tooltip permanent direction="top" offset={[0, -24]} className="vj-map-tooltip">
                          <MapTooltip event={event} />
                        </Tooltip>
                        <Popup className="vj-map-popup">
                          <div className="min-w-48">
                            <strong>{event.place?.name || "Địa điểm"}</strong>
                            <p>{formatTimeRange(event)}</p>
                            <p>{event.place?.address || eventDistrict(event)}</p>
                          </div>
                        </Popup>
                      </Marker>
                    ))
                  : null}
              </MapContainer>

              <button
                type="button"
                onClick={() => setRouteSummaryOpen((current) => !current)}
                aria-label="Mở tổng quan lộ trình"
                aria-expanded={routeSummaryOpen}
                className="absolute bottom-4 right-4 z-[470] flex size-12 items-center justify-center rounded-xl border border-border bg-card/95 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:-translate-y-0.5"
              >
                <BarChart3 className="size-6" />
              </button>
              {routeSummaryOpen ? (
                <MapSummaryBar
                  placeCount={mappedEvents.length}
                  distanceKm={totalDistance}
                  travelMinutes={travelMinutes}
                />
              ) : null}

              <MapLayerControl
                open={layerMenuOpen}
                layer={layer}
                showPlaces={showPlaces}
                onLayerChange={setLayer}
                onToggleOpen={() => setLayerMenuOpen((current) => !current)}
                onTogglePlaces={() => setShowPlaces((current) => !current)}
              />
              <MapAttribution />
            </div>
          </section>
        </div>
      </div>
      {tipsOpen ? <UsageTipsModal onClose={() => setTipsOpen(false)} /> : null}
    </main>
  );
}

function RouteListItem({ event, index }: { event: MappedEvent; index: number }) {
  return (
    <article className="relative grid grid-cols-[40px_minmax(0,1fr)] gap-3">
      <div className="flex flex-col items-center">
        <span className="z-10 flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[0_8px_18px_oklch(0.515_0.22_277_/_0.24)]">
          {index + 1}
        </span>
        <span className="mt-1 h-full min-h-12 w-px bg-primary/30" />
      </div>
      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm">
        <img src={eventImage(event)} alt={event.place?.name || "Địa điểm"} className="size-16 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-foreground">{event.place?.name || "Địa điểm"}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{formatTimeRange(event)}</p>
          <span className={cn("mt-2 inline-flex rounded-lg px-2 py-1 text-xs font-medium", categoryTone[event.category])}>
            {categoryLabel(event.category)}
          </span>
        </div>
      </div>
    </article>
  );
}

function SummaryPill({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Route;
  label: string;
  value: string | number;
  tone: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-center gap-3 px-2 first:pl-0 last:pr-0">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-bold leading-none text-foreground">{value}</span>
        <span className="mt-1 block text-sm font-semibold leading-none text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function MapSummaryBar({
  placeCount,
  distanceKm,
  travelMinutes,
}: {
  placeCount: number;
  distanceKm: number;
  travelMinutes: number;
}) {
  return (
    <div className="absolute bottom-4 right-[76px] z-[470] grid w-[min(420px,calc(100%_-_96px))] grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card/96 px-4 py-3 shadow-[0_18px_46px_rgba(15,23,42,0.16)] backdrop-blur-xl">
      <SummaryPill icon={MapPinned} value={placeCount} label="địa điểm" tone="text-primary bg-primary/10" />
      <SummaryPill icon={Route} value={distanceKm.toFixed(1)} label="km" tone="text-blue-500 bg-blue-500/10" />
      <SummaryPill icon={Clock3} value={travelMinutes} label="phút" tone="text-green-600 bg-green-500/12" />
    </div>
  );
}

function MapTooltip({ event }: { event: MappedEvent }) {
  return (
    <div className="flex items-center gap-3">
      <img src={eventImage(event)} alt="" className="size-12 rounded-xl object-cover" />
      <div className="min-w-0">
        <p className="max-w-36 truncate font-semibold text-foreground">{event.place?.name || "Địa điểm"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{formatTimeRange(event)}</p>
      </div>
    </div>
  );
}

function MapLayerControl({
  open,
  layer,
  showPlaces,
  onLayerChange,
  onToggleOpen,
  onTogglePlaces,
}: {
  open: boolean;
  layer: MapLayer;
  showPlaces: boolean;
  onLayerChange: (layer: MapLayer) => void;
  onToggleOpen: () => void;
  onTogglePlaces: () => void;
}) {
  return (
    <div className="absolute right-4 top-4 z-[470] flex flex-col items-end gap-3">
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label={open ? "Đóng lớp bản đồ" : "Mở lớp bản đồ"}
        aria-expanded={open}
        className="flex size-12 items-center justify-center rounded-xl border border-border bg-card/95 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:-translate-y-0.5"
      >
        <Layers className="size-6" />
      </button>

      {open ? (
        <div className="w-[310px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
          <div className="divide-y divide-border px-4 py-2">
            {layerOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLayerChange(option.value)}
                className="flex w-full items-center gap-4 py-3 text-left text-lg font-semibold text-foreground"
              >
                <img
                  src={option.preview}
                  alt={`Xem trước ${option.label}`}
                  className="h-14 w-20 shrink-0 rounded-xl object-cover"
                />
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    layer === option.value ? "border-primary" : "border-slate-400",
                  )}
                  aria-hidden="true"
                >
                  {layer === option.value ? <span className="size-3.5 rounded-full bg-primary" /> : null}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onTogglePlaces}
            className="flex w-full items-center justify-between border-t border-border px-4 py-4 text-left text-base font-semibold text-foreground"
          >
            Hiển thị điểm quan tâm
            <span
              className={cn(
                "flex h-7 w-12 items-center rounded-full p-1 transition-colors",
                showPlaces ? "bg-primary" : "bg-muted",
              )}
              aria-hidden="true"
            >
              <span
                className={cn(
                  "size-5 rounded-full bg-white shadow-sm transition-transform",
                  showPlaces ? "translate-x-5" : "translate-x-0",
                )}
              />
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

function UsageTipsModal({ onClose }: { onClose: () => void }) {
  const tips = [
    {
      icon: CalendarDays,
      text: (
        <>
          Chọn chuyến đi trước khi
          <br />
          xem bản đồ
        </>
      ),
      tone: "bg-primary/10 text-primary",
    },
    {
      icon: CalendarDays,
      text: (
        <>
          Chuyển ngày để xem
          <br />
          lộ trình từng ngày
        </>
      ),
      tone: "bg-blue-500/10 text-blue-500",
    },
    {
      icon: List,
      text: (
        <>
          Bấm <strong>Mở Timeline</strong>
          <br />
          để thêm địa điểm
        </>
      ),
      tone: "bg-fuchsia-500/10 text-primary",
    },
    {
      icon: Layers,
      text: (
        <>
          Dùng lớp bản đồ
          <br />
          để đổi chế độ xem
        </>
      ),
      tone: "bg-green-500/12 text-green-600",
    },
  ];

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-[3px]">
      <section
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl shadow-slate-950/25"
      >
        <header className="flex items-center justify-between px-5 py-5">
          <h2 className="text-lg font-bold text-foreground">Mẹo sử dụng</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="space-y-4 px-5 pb-5">
          {tips.map((tip) => {
            const Icon = tip.icon;
            return (
              <div key={tip.tone} className="flex gap-4">
                <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tip.tone)}>
                  <Icon className="size-5" />
                </span>
                <p className="text-sm font-medium leading-6 text-foreground">{tip.text}</p>
              </div>
            );
          })}
        </div>

        <footer className="flex items-center justify-between border-t border-border px-5 py-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" className="size-4 rounded border-border" />
            Không hiển thị lại
          </label>
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg bg-primary px-8 text-sm font-semibold text-primary-foreground"
          >
            Đã hiểu
          </button>
        </footer>
      </section>
    </div>
  );
}

function MapAttribution() {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      className={cn(
        "vj-map-attribution absolute bottom-3 left-4 z-[460] flex items-center rounded-full border border-border/70 bg-card/80 text-[11px] text-muted-foreground shadow-sm backdrop-blur-xl transition-all duration-200 sm:left-32",
        open ? "gap-1.5 px-3 py-1.5" : "px-1.5 py-1.5",
      )}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        aria-label="Thông tin bản quyền bản đồ"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
      >
        <Info className="size-3.5" />
      </button>
      <div
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-200",
          open ? "max-w-[260px] opacity-100" : "max-w-0 opacity-0",
        )}
      >
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OpenStreetMap
        </a>
        <span> · </span>
        <a href="https://carto.com/attribution/" target="_blank" rel="noreferrer">
          © CARTO
        </a>
      </div>
    </div>
  );
}
