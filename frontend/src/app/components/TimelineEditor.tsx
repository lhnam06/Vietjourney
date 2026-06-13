import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  categoryFilter,
  categoryLabel,
  compactPrice,
  fetchPlaces,
  placeImage,
  type Place,
} from "../lib/placesApi";
import {
  createTimelineEvent,
  deleteTimelineEvent,
  fetchTimelineEvents,
  moveTimelineEvent,
  resizeTimelineEvent,
  type Timeline,
  type TimelineEvent,
  type TimelineEventCategory,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";

const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const hours = Array.from({ length: 24 }, (_, index) => index);
const hourHeight = 42;
const dayColumnWidth = "minmax(128px,1fr)";

type DragPayload =
  | { kind: "place"; placeId: string }
  | { kind: "event"; eventId: string };

interface ResizeState {
  eventId: string;
  startY: number;
  initialEnd: Date;
  previewEnd: Date;
}

interface TimelineEditorProps {
  timeline: Timeline;
  onBack: () => void;
}

export function TimelineEditor({ timeline, onBack }: TimelineEditorProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(timeline.events);
  const [places, setPlaces] = useState<Place[]>([]);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(timeline.startDate)));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edgeHint, setEdgeHint] = useState<"previous" | "next" | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const edgeSwitchRef = useRef<number | null>(null);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );
  const rangeStart = toDateTimeInput(weekDays[0], 0, 0);
  const rangeEnd = toDateTimeInput(addDays(weekDays[6], 1), 0, 0);
  const timelineStart = dateOnly(timeline.startDate);
  const timelineEnd = dateOnly(timeline.endDate);
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );
  const placeById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );
  const savedPlaceCards = useMemo(() => {
    const eventPlaces = events
      .map((event) => event.place)
      .filter((place): place is NonNullable<TimelineEvent["place"]> => Boolean(place))
      .map((place) => ({
        id: place.id,
        name: place.name,
        category: undefined,
        rating: place.rating,
        district: place.district,
        images: place.imageUrl ? [place.imageUrl] : null,
      })) satisfies Place[];

    const merged = [...eventPlaces, ...places];
    return Array.from(new Map(merged.map((place) => [place.id, place])).values()).slice(0, 10);
  }, [events, places]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [nextEvents, foodPlaces, activityPlaces, drinkPlaces] = await Promise.all([
          fetchTimelineEvents(timeline.id, rangeStart, rangeEnd, controller.signal),
          fetchPlaces({ category: "food", size: 8 }, controller.signal),
          fetchPlaces({ category: "activity", size: 8 }, controller.signal),
          fetchPlaces({ category: "drink", size: 8 }, controller.signal),
        ]);
        setEvents(nextEvents);
        setPlaces([
          ...foodPlaces.data,
          ...activityPlaces.data,
          ...drinkPlaces.data,
        ]);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Không tải được timeline.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [rangeEnd, rangeStart, timeline.id]);

  useEffect(() => {
    if (!resizeState) return undefined;

    function onPointerMove(event: globalThis.PointerEvent) {
      const deltaRows = Math.round((event.clientY - resizeState.startY) / (hourHeight / 2));
      const nextEnd = addMinutes(resizeState.initialEnd, deltaRows * 30);
      const source = eventById.get(resizeState.eventId);
      if (!source) return;

      const minEnd = addMinutes(new Date(source.startTime), 30);
      setResizeState({
        ...resizeState,
        previewEnd: nextEnd < minEnd ? minEnd : nextEnd,
      });
    }

    async function onPointerUp() {
      const source = eventById.get(resizeState.eventId);
      if (!source) {
        setResizeState(null);
        return;
      }

      setResizeState(null);
      await resizeEvent(source, resizeState.previewEnd);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [eventById, resizeState]);

  async function reloadEvents() {
    const nextEvents = await fetchTimelineEvents(timeline.id, rangeStart, rangeEnd);
    setEvents(nextEvents);
  }

  function changeWeek(offset: number) {
    const nextStart = addDays(weekStart, offset * 7);
    if (nextStart > timelineEnd || addDays(nextStart, 6) < timelineStart) {
      return;
    }
    setWeekStart(nextStart);
  }

  function handleDragStart(event: DragEvent, payload: DragPayload) {
    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = payload.kind === "place" ? "copyMove" : "move";
  }

  function handleCalendarDragOver(event: DragEvent) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const edgeSize = 54;
    const nearLeft = event.clientX - rect.left < edgeSize;
    const nearRight = rect.right - event.clientX < edgeSize;

    if (nearLeft || nearRight) {
      const direction = nearLeft ? "previous" : "next";
      setEdgeHint(direction);
      if (!edgeSwitchRef.current) {
        edgeSwitchRef.current = window.setTimeout(() => {
          changeWeek(direction === "previous" ? -1 : 1);
          edgeSwitchRef.current = null;
        }, 650);
      }
    } else {
      setEdgeHint(null);
      if (edgeSwitchRef.current) {
        window.clearTimeout(edgeSwitchRef.current);
        edgeSwitchRef.current = null;
      }
    }
  }

  function handleDragLeave() {
    setEdgeHint(null);
    if (edgeSwitchRef.current) {
      window.clearTimeout(edgeSwitchRef.current);
      edgeSwitchRef.current = null;
    }
  }

  async function handleDrop(event: DragEvent, day: Date, hour: number) {
    event.preventDefault();
    setEdgeHint(null);
    const payload = parseDragPayload(event);
    if (!payload) return;

    const start = toDateTimeInput(day, hour, 0);
    const end = hour === 23 ? toDateTimeInput(day, 23, 59) : toDateTimeInput(day, hour + 1, 0);
    if (!isWithinTimeline(new Date(start), new Date(end), timelineStart, timelineEnd)) {
      setError("Khung giờ nằm ngoài thời gian của chuyến đi.");
      return;
    }

    try {
      setError(null);
      if (payload.kind === "place") {
        const place = placeById.get(payload.placeId) || savedPlaceCards.find((item) => item.id === payload.placeId);
        if (!place) return;
        const created = await createTimelineEvent(timeline.id, {
          externalPlaceId: place.id,
          category: toEventCategory(place.category),
          startTime: start,
          endTime: end,
          orderIndex: dayEvents(day).length,
          status: "PLANNED",
        });
        setEvents((current) => [...current, created]);
        return;
      }

      const source = eventById.get(payload.eventId);
      if (!source) return;
      const duration = differenceMinutes(new Date(source.endTime), new Date(source.startTime));
      const movedEnd = toDateTimeInput(addMinutes(new Date(start), duration));
      await moveEvent(source, start, movedEnd, dayEvents(day).length);
    } catch (dropError) {
      setError(dropError instanceof Error ? dropError.message : "Không cập nhật được lịch trình.");
      await reloadEvents();
    }
  }

  async function moveEvent(source: TimelineEvent, startTime: string, endTime: string, orderIndex?: number) {
    setSavingId(source.id);
    try {
      const updated = await moveTimelineEvent(timeline.id, source.id, {
        startTime,
        endTime,
        orderIndex,
      });
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } finally {
      setSavingId(null);
    }
  }

  async function resizeEvent(source: TimelineEvent, nextEnd: Date) {
    setSavingId(source.id);
    try {
      const updated = await resizeTimelineEvent(timeline.id, source.id, {
        startTime: source.startTime,
        endTime: toDateTimeInput(nextEnd),
      });
      setEvents((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (resizeError) {
      setError(resizeError instanceof Error ? resizeError.message : "Không đổi được thời lượng.");
      await reloadEvents();
    } finally {
      setSavingId(null);
    }
  }

  async function removeEvent(eventId: string) {
    setSavingId(eventId);
    try {
      await deleteTimelineEvent(timeline.id, eventId);
      setEvents((current) => current.filter((event) => event.id !== eventId));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được card.");
    } finally {
      setSavingId(null);
    }
  }

  function dayEvents(day: Date) {
    return events
      .filter((event) => sameDate(new Date(event.startTime), day))
      .sort((first, second) => first.orderIndex - second.orderIndex);
  }

  const weekRangeText = `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[linear-gradient(135deg,oklch(0.99_0.004_280),oklch(0.965_0.014_277))] p-4 lg:p-5">
      <div className="grid min-h-full gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100vh-40px)] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm xl:sticky xl:top-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Chuyến đi của tôi
            </button>
            <button className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Plus className="size-4" />
              Tạo mới
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background px-4 py-3">
            <p className="text-xs text-muted-foreground">Đang chỉnh sửa</p>
            <h1 className="mt-1 truncate text-lg font-bold text-foreground">{timeline.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatShortDate(timelineStart)} - {formatShortDate(timelineEnd)}
            </p>
          </div>

          <div className="mt-5 flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/25 bg-accent/25 p-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl border border-primary/25 bg-card text-primary">
              <GripVertical className="size-6" />
            </span>
            <h2 className="mt-4 font-bold text-foreground">Kéo địa điểm vào lịch</h2>
            <p className="mt-2 max-w-64 text-sm leading-6 text-muted-foreground">
              Kéo card bên dưới vào ngày và khung giờ bạn muốn.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <h2 className="font-bold text-foreground">Địa điểm đã lưu ({savedPlaceCards.length})</h2>
            {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
          </div>

          <div className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
            {savedPlaceCards.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                onDragStart={(event) => handleDragStart(event, { kind: "place", placeId: place.id })}
              />
            ))}
          </div>

          <button
            type="button"
            className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-primary px-4 py-4 text-sm font-semibold text-primary-foreground shadow-[0_16px_32px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5"
          >
            <CalendarDays className="size-5" />
            Tạo lịch từ danh sách
          </button>
        </aside>

        <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lên lịch trình cho chuyến đi</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Kéo địa điểm vào khung giờ, kéo card để đổi ngày hoặc kéo mép dưới để đổi thời lượng.
              </p>
            </div>
            <div className="rounded-xl border border-primary/20 bg-accent px-4 py-2 text-sm font-semibold text-primary">
              Mẹo sử dụng
            </div>
          </header>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeWeek(-1)}
                className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => changeWeek(1)}
                className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="flex h-11 items-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground">
                <CalendarDays className="size-4 text-primary" />
                {weekRangeText}
              </div>
            </div>

            <div className="flex rounded-xl border border-border bg-background p-1">
              <button className="rounded-lg px-5 py-2 text-sm font-medium text-muted-foreground">Ngày</button>
              <button className="rounded-lg bg-card px-5 py-2 text-sm font-semibold text-primary shadow-sm">Tuần</button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-red-50 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div
            className="relative mt-5 overflow-x-auto overflow-y-visible rounded-2xl border border-border bg-white"
            onDragOver={handleCalendarDragOver}
            onDragLeave={handleDragLeave}
          >
            {edgeHint ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-y-16 z-30 flex w-28 items-center justify-center rounded-2xl border border-dashed border-primary/45 bg-accent/80 text-center text-xs font-semibold text-primary backdrop-blur",
                  edgeHint === "previous" ? "left-3" : "right-3",
                )}
              >
                {edgeHint === "previous" ? "Tuần trước" : "Tuần tiếp theo"}
              </div>
            ) : null}

            <div
              className="min-w-[980px] grid"
              style={{
                gridTemplateColumns: `68px repeat(7, ${dayColumnWidth})`,
              }}
            >
              <div className="sticky left-0 top-0 z-20 border-b border-r border-border bg-card px-4 py-4 text-sm font-semibold text-primary">
                Giờ
              </div>
              {weekDays.map((day, index) => (
                <div key={day.toISOString()} className="sticky top-0 z-10 border-b border-r border-border bg-card px-4 py-3 text-center">
                  <p className="font-semibold text-foreground">{dayLabels[index]}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatShortDate(day)}</p>
                </div>
              ))}

              {hours.map((hour) => (
                <div key={`row-${hour}`} className="contents">
                  <div
                    className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                    style={{ height: hourHeight }}
                  >
                    {hour === 23 ? "23:00 - 23:59" : `${String(hour).padStart(2, "0")}:00`}
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      className="relative border-b border-r border-dashed border-border/75 bg-white transition hover:bg-accent/20"
                      style={{ height: hourHeight }}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => handleDrop(event, day, hour)}
                    />
                  ))}
                </div>
              ))}

              <div className="pointer-events-none absolute left-[68px] right-0 top-[73px]">
                {weekDays.map((day, dayIndex) =>
                  dayEvents(day).map((event) => (
                    <TimelineCard
                      key={event.id}
                      event={event}
                      dayIndex={dayIndex}
                      saving={savingId === event.id}
                      resizing={resizeState?.eventId === event.id ? resizeState.previewEnd : null}
                      onDragStart={(dragEvent) => handleDragStart(dragEvent, { kind: "event", eventId: event.id })}
                      onResizeStart={(pointerEvent) => {
                        pointerEvent.preventDefault();
                        setResizeState({
                          eventId: event.id,
                          startY: pointerEvent.clientY,
                          initialEnd: new Date(event.endTime),
                          previewEnd: new Date(event.endTime),
                        });
                      }}
                      onDelete={() => removeEvent(event.id)}
                    />
                  )),
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-primary/10 bg-accent/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5" />
                <span className="font-bold">Gợi ý lịch trình cho bạn</span>
              </div>
              <button className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
                Tạo lịch tự động
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function PlaceCard({
  place,
  onDragStart,
}: {
  place: Place;
  onDragStart: (event: DragEvent) => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      className="group flex cursor-grab items-center gap-3 rounded-2xl border border-border bg-card p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing"
    >
      <img src={placeImage(place)} alt={place.name} className="size-20 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold text-foreground">{place.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          ★ {place.rating?.toFixed(1) || "4.6"} · {compactPrice(place)}
        </p>
        <span className="mt-2 inline-flex rounded-lg bg-accent px-2 py-1 text-xs font-medium text-primary">
          {categoryLabel(place.category)}
        </span>
      </div>
      <button className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-primary">
        <Plus className="size-5" />
      </button>
      <GripVertical className="size-5 shrink-0 text-muted-foreground" />
    </article>
  );
}

function TimelineCard({
  event,
  dayIndex,
  saving,
  resizing,
  onDragStart,
  onResizeStart,
  onDelete,
}: {
  event: TimelineEvent;
  dayIndex: number;
  saving: boolean;
  resizing: Date | null;
  onDragStart: (event: DragEvent) => void;
  onResizeStart: (event: PointerEvent) => void;
  onDelete: () => void;
}) {
  const start = new Date(event.startTime);
  const end = resizing || new Date(event.endTime);
  const top = (start.getHours() * 60 + start.getMinutes()) * (hourHeight / 60);
  const height = Math.max(34, differenceMinutes(end, start) * (hourHeight / 60));
  const width = `calc((100% - 0px) / 7 - 10px)`;
  const left = `calc(${dayIndex} * (100% / 7) + 5px)`;

  return (
    <article
      draggable={!resizing}
      onDragStart={onDragStart}
      className={cn(
        "pointer-events-auto absolute z-20 cursor-grab overflow-hidden rounded-lg border border-primary/20 bg-accent/90 p-2 text-xs shadow-sm transition hover:z-30 hover:shadow-md active:cursor-grabbing",
        saving ? "opacity-60" : "",
      )}
      style={{ left, top, width, height }}
    >
      <div className="flex h-full min-h-0 gap-2">
        <img
          src={event.place?.imageUrl || `https://picsum.photos/seed/${event.externalPlaceId}/96/96`}
          alt={event.place?.name || "Địa điểm"}
          className="size-9 shrink-0 rounded-md object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <h3 className="line-clamp-2 flex-1 font-bold leading-snug text-foreground">
              {event.place?.name || "Địa điểm"}
            </h3>
            <button
              type="button"
              onClick={onDelete}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {formatTime(start)} - {formatTime(end)}
          </p>
        </div>
        <MoreHorizontal className="size-4 shrink-0 text-muted-foreground" />
      </div>
      <button
        type="button"
        aria-label="Đổi thời lượng"
        onPointerDown={onResizeStart}
        className="absolute inset-x-2 bottom-1 h-2 cursor-ns-resize rounded-full bg-primary/25 opacity-0 transition group-hover:opacity-100 hover:bg-primary/40"
      />
    </article>
  );
}

function parseDragPayload(event: DragEvent): DragPayload | null {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json")) as DragPayload;
  } catch {
    return null;
  }
}

function toEventCategory(category?: Place["category"] | null): TimelineEventCategory {
  const normalized = category?.toUpperCase();
  if (normalized === "FOOD" || categoryFilter(normalized || "") === "food") return "FOOD";
  if (normalized === "DRINK" || categoryFilter(normalized || "") === "drink") return "DRINK";
  return "ACTIVITY";
}

function dateOnly(value: string | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfWeek(date: Date) {
  const next = dateOnly(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMinutes(date: Date, minutes: number) {
  const next = new Date(date);
  next.setMinutes(next.getMinutes() + minutes);
  return next;
}

function differenceMinutes(end: Date, start: Date) {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function sameDate(first: Date, second: Date) {
  return dateOnly(first).getTime() === dateOnly(second).getTime();
}

function toDateTimeInput(date: Date, hour?: number, minute = 0) {
  const next = new Date(date);
  if (hour != null) {
    next.setHours(hour, minute, 0, 0);
  }
  const yyyy = next.getFullYear();
  const mm = String(next.getMonth() + 1).padStart(2, "0");
  const dd = String(next.getDate()).padStart(2, "0");
  const hh = String(next.getHours()).padStart(2, "0");
  const mi = String(next.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:00`;
}

function isWithinTimeline(start: Date, end: Date, timelineStart: Date, timelineEnd: Date) {
  const endExclusive = addDays(timelineEnd, 1);
  return start >= timelineStart && end <= endExclusive;
}

function formatShortDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
