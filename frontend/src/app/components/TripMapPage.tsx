import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bus,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Loader2,
  MapPinned,
  MoreHorizontal,
  Navigation,
  Route,
  Rocket,
  Sparkles,
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

type MapLayer = "street" | "satellite";

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
};

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

function formatDayLabel(date: Date, index: number) {
  return `Ngày ${index + 1} - ${new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(date)}`;
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
    iconSize: [42, 50],
    iconAnchor: [21, 44],
    popupAnchor: [0, -42],
    tooltipAnchor: [0, -36],
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

export function TripMapPage({ timeline, onBack }: TripMapPageProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(timeline.events);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [layer, setLayer] = useState<MapLayer>("street");
  const [showPlaces, setShowPlaces] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeState, setRouteState] = useState<RouteState>({
    path: [],
    distanceKm: 0,
    durationMinutes: 0,
    loading: false,
    error: null,
  });

  const days = useMemo(
    () => Array.from({ length: dayCount(timeline.startDate, timeline.endDate) }, (_, index) => addDays(dateOnly(timeline.startDate), index)),
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

  function shiftDay(direction: -1 | 1) {
    setSelectedDayIndex((current) => Math.min(Math.max(current + direction, 0), days.length - 1));
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background px-5 py-6 lg:px-8">
      <div className="mx-auto max-w-[1500px]">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
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
          <div className="flex items-center gap-3">
            <button className="hidden items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm sm:flex">
              <Info className="size-4 text-primary" />
              Mẹo sử dụng
            </button>
            <div className="flex rounded-2xl border border-border bg-card p-1 shadow-sm">
              <button className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm">
                Bản đồ
              </button>
              <button className="rounded-xl px-6 py-3 text-sm font-semibold text-muted-foreground">
                Lộ trình
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
          <aside className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Chuyến đi</label>
              <div className="mt-2 flex gap-3">
                <button className="flex min-w-0 flex-1 items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left font-medium text-foreground shadow-sm">
                  <span className="truncate">{timeline.title || "VietJourney"}</span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
                <button className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
                  <MoreHorizontal className="size-5" />
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground">Ngày</label>
              <div className="mt-2 grid grid-cols-[48px_minmax(0,1fr)_48px] gap-3">
                <button
                  type="button"
                  onClick={() => shiftDay(-1)}
                  disabled={selectedDayIndex === 0}
                  className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <button className="flex min-w-0 items-center justify-center gap-3 rounded-xl border border-border bg-card px-3 py-3 font-semibold text-foreground shadow-sm">
                  <CalendarDays className="size-5 text-muted-foreground" />
                  <span className="truncate">{formatDayLabel(selectedDay, selectedDayIndex)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => shiftDay(1)}
                  disabled={selectedDayIndex === days.length - 1}
                  className="flex size-12 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
            </div>

            {error ? (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <section>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Lộ trình trong ngày ({mappedEvents.length})
                </h2>
                {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
              </div>

              <div className="mt-4 space-y-3">
                {mappedEvents.length ? (
                  mappedEvents.map((event, index) => (
                    <RouteListItem key={event.id} event={event} index={index} />
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-primary/30 bg-accent/30 p-6 text-center">
                    <MapPinned className="mx-auto size-8 text-primary" />
                    <p className="mt-3 font-semibold text-foreground">Chưa có địa điểm trong ngày này</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Thêm hoạt động ở Timeline để bản đồ tự tạo lộ trình.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-muted/35 p-4">
              <h3 className="text-sm font-semibold text-foreground">Tổng quan chuyến đi trong ngày</h3>
              <div className="mt-4 space-y-3 text-sm">
                <SummaryRow icon={Route} label="Tổng quãng đường" value={`${totalDistance.toFixed(1)} km`} />
                <SummaryRow icon={Clock3} label="Tổng thời gian di chuyển" value={`${travelMinutes} phút`} />
                <SummaryRow icon={Bus} label="Phương tiện" value="Đi bộ + Taxi" />
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

            <button className="flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-5 py-4 font-semibold text-primary-foreground shadow-[0_14px_32px_oklch(0.515_0.22_277_/_0.24)] transition-all hover:-translate-y-0.5">
              <Sparkles className="size-5" />
              Tối ưu tuyến đường
            </button>
          </aside>

          <section className="min-w-0 space-y-5">
            <div className="relative h-[620px] overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
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

              <MapLayerControl
                layer={layer}
                showPlaces={showPlaces}
                onLayerChange={setLayer}
                onTogglePlaces={() => setShowPlaces((current) => !current)}
              />
              <MapAttribution />

              <div className="absolute bottom-5 right-5 z-[450] rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur">
                <div className="flex items-center gap-3">
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
                    <Navigation className="size-7" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-foreground">
                      Lộ trình hôm nay
                      <ChevronDown className="size-4 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{mappedEvents.length} địa điểm</p>
                    <p className="text-sm font-semibold text-primary">
                      {routeState.loading ? "Đang tính tuyến..." : `${travelMinutes} phút di chuyển`}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-primary">
                    <Sparkles className="size-5" />
                    Gợi ý di chuyển thông minh
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    AI đề xuất tuyến tối ưu để giảm thời gian di chuyển giữa các địa điểm.
                  </p>
                </div>
                <button className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground shadow-[0_12px_26px_oklch(0.515_0.22_277_/_0.22)]">
                  <Rocket className="size-5" />
                  Áp dụng gợi ý
                </button>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <SmartTip icon={MapPinned} title="Ưu tiên gần nhau" description="Giảm quãng đường di chuyển" />
                <SmartTip icon={Clock3} title="Tránh giờ đông" description="Tiết kiệm thời gian chờ" />
                <SmartTip icon={Route} title="Tối ưu chi phí" description="Kết hợp đi bộ + phương tiện" />
              </div>
            </section>
          </section>
        </div>
      </div>
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
        <MoreHorizontal className="size-5 shrink-0 text-muted-foreground" />
      </div>
    </article>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-muted-foreground" />
      <span className="min-w-0 flex-1 text-muted-foreground">{label}</span>
      <span className="font-semibold text-primary">{value}</span>
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
  layer,
  showPlaces,
  onLayerChange,
  onTogglePlaces,
}: {
  layer: MapLayer;
  showPlaces: boolean;
  onLayerChange: (layer: MapLayer) => void;
  onTogglePlaces: () => void;
}) {
  return (
    <div className="absolute right-5 top-5 z-[450] rounded-2xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur">
      <div className="space-y-3 text-sm font-medium">
        <label className="flex items-center gap-3">
          <input
            type="radio"
            checked={layer === "street"}
            onChange={() => onLayerChange("street")}
            className="size-5 accent-primary"
          />
          Đường
        </label>
        <label className="flex items-center gap-3">
          <input
            type="radio"
            checked={layer === "satellite"}
            onChange={() => onLayerChange("satellite")}
            className="size-5 accent-primary"
          />
          Vệ tinh
        </label>
        <div className="border-t border-border" />
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showPlaces}
            onChange={onTogglePlaces}
            className="size-5 accent-primary"
          />
          Địa điểm
        </label>
      </div>
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

function SmartTip({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof MapPinned;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}
