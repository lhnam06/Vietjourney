import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { PlaceList } from "../App";
import {
  categoryFilter,
  categoryLabel,
  compactPrice,
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
import { NewListModal } from "./Popups";
import { listIcon } from "./ListPanel";

const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const hours = Array.from({ length: 24 }, (_, index) => index);
const hourHeight = 54;
const calendarHeaderHeight = 88;
const timeColumnWidth = 86;
const dayColumnWidth = "minmax(156px,1fr)";
const eventCardInset = 8;

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
  placeLists: PlaceList[];
  activeListId: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string, icon?: string) => void;
  onBack: () => void;
}

export function TimelineEditor({
  timeline,
  placeLists,
  activeListId,
  onSelectList,
  onCreateList,
  onBack,
}: TimelineEditorProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(timeline.events);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(timeline.startDate)));
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [edgeHint, setEdgeHint] = useState<"previous" | "next" | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const edgeSwitchRef = useRef<number | null>(null);
  const activeList = placeLists.find((list) => list.id === activeListId) || placeLists[0];
  const ActiveListIcon = listIcon(activeList?.icon);

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
  const savedPlaceCards = activeList?.places || [];
  const placeById = useMemo(
    () => new Map(savedPlaceCards.map((place) => [place.id, place])),
    [savedPlaceCards],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const nextEvents = await fetchTimelineEvents(timeline.id, rangeStart, rangeEnd, controller.signal);
        setEvents(nextEvents);
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
    if (!isTimelineDay(day, timelineStart, timelineEnd)) {
      return;
    }
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
        const place = placeById.get(payload.placeId);
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

  function canDropOnDay(day: Date) {
    return isTimelineDay(day, timelineStart, timelineEnd);
  }

  const weekRangeText = `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background px-4 pb-5 pt-10 lg:px-5">
      <div className="grid min-h-full gap-5 xl:grid-cols-[390px_minmax(0,1fr)]">
        <aside className="flex max-h-[calc(100vh-40px)] flex-col rounded-2xl border border-border bg-card p-5 shadow-sm xl:sticky xl:top-5">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15"
            >
              <ArrowLeft className="size-4" />
              Chuyến đi của tôi
            </button>
            <button
              type="button"
              onClick={() => setIsNewListOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5 hover:opacity-95"
            >
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

          <div className="relative mt-5">
            <button
              type="button"
              onClick={() => setIsListMenuOpen((open) => !open)}
              className="flex h-12 w-full items-center justify-between rounded-xl border border-border bg-background px-4 text-left text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/35 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ActiveListIcon className="size-4" />
                </span>
                <span className="truncate">{activeList?.name || "Danh sách"}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
            {isListMenuOpen ? (
              <div className="absolute left-0 right-0 top-14 z-30 max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl">
                {placeLists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      onSelectList(list.id);
                      setIsListMenuOpen(false);
                    }}
                    className={cn(
                      "flex h-10 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-medium transition-colors",
                      list.id === activeList?.id
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {(() => {
                        const Icon = listIcon(list.icon);
                        return <Icon className="size-4 shrink-0" />;
                      })()}
                      <span className="truncate">{list.name}</span>
                    </span>
                    <span className="ml-3 text-xs opacity-75">{list.places.length}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-dashed border-primary/25 bg-accent/25 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-card text-primary">
              <GripVertical className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-foreground">Kéo địa điểm vào lịch</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Kéo card trong danh sách vào ngày và khung giờ bạn muốn.
              </p>
            </div>
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
            {!savedPlaceCards.length ? (
              <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                Danh sách này chưa có địa điểm. Quay lại Khám phá để thêm địa điểm hoặc chọn danh sách khác.
              </div>
            ) : null}
          </div>
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
                className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition hover:bg-primary/15"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => changeWeek(1)}
                className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition hover:bg-primary/15"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="flex h-11 items-center gap-3 rounded-xl border border-border bg-background px-4 text-sm font-semibold text-foreground shadow-sm">
                <CalendarDays className="size-4 text-primary" />
                {weekRangeText}
              </div>
            </div>

            <div className="flex rounded-xl border border-primary/20 bg-primary/10 p-1 shadow-sm">
              <button className="rounded-lg px-5 py-2 text-sm font-medium text-primary/70 hover:bg-card">Ngày</button>
              <button className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm">Tuần</button>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <div
            className="relative mt-5 overflow-x-auto overflow-y-visible rounded-2xl border border-border bg-background"
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
              className="min-w-[1180px] grid"
              style={{
                gridTemplateColumns: `${timeColumnWidth}px repeat(7, ${dayColumnWidth})`,
              }}
            >
              <div
                className="sticky left-0 top-0 z-20 flex items-center border-b border-r border-border bg-card px-5 text-sm font-semibold text-primary"
                style={{ height: calendarHeaderHeight }}
              >
                Giờ
              </div>
              {weekDays.map((day, index) => {
                const available = canDropOnDay(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "sticky top-0 z-10 flex flex-col items-center justify-center border-b border-r border-border px-4 text-center",
                      available ? "bg-card" : "bg-muted text-muted-foreground",
                    )}
                    style={{ height: calendarHeaderHeight }}
                  >
                    <p className={cn("font-semibold", available ? "text-foreground" : "text-muted-foreground")}>
                      {dayLabels[index]}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatShortDate(day)}</p>
                  </div>
                );
              })}

              {hours.map((hour) => (
                <div key={`row-${hour}`} className="contents">
                  <div
                    className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground"
                    style={{ height: hourHeight }}
                  >
                    {hour === 23 ? "23:00 - 23:59" : `${String(hour).padStart(2, "0")}:00`}
                  </div>
                  {weekDays.map((day) => {
                    const available = canDropOnDay(day);

                    return (
                      <div
                        key={`${day.toISOString()}-${hour}`}
                        className={cn(
                          "relative border-b border-r border-dashed border-border/75 transition",
                          available
                            ? "bg-card hover:bg-accent/30"
                            : "cursor-not-allowed bg-muted/80",
                        )}
                        style={{ height: hourHeight }}
                        onDragOver={available ? (event) => event.preventDefault() : undefined}
                        onDrop={available ? (event) => handleDrop(event, day, hour) : undefined}
                      />
                    );
                  })}
                </div>
              ))}

              <div
                className="pointer-events-none absolute right-0"
                style={{ left: timeColumnWidth, top: calendarHeaderHeight }}
              >
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
      {isNewListOpen ? (
        <NewListModal
          onCreate={(name, icon) => {
            onCreateList(name, icon);
            setIsNewListOpen(false);
          }}
          onClose={() => setIsNewListOpen(false)}
        />
      ) : null}
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
  const height = Math.max(52, differenceMinutes(end, start) * (hourHeight / 60));
  const width = `calc((100% / 7) - ${eventCardInset * 2}px)`;
  const left = `calc(${dayIndex} * (100% / 7) + ${eventCardInset}px)`;

  return (
    <article
      draggable={!resizing}
      onDragStart={onDragStart}
      className={cn(
        "group pointer-events-auto absolute z-20 cursor-grab overflow-hidden rounded-xl border border-primary/20 bg-card p-2 text-xs shadow-sm transition hover:z-30 hover:bg-accent/60 hover:shadow-md active:cursor-grabbing",
        saving ? "opacity-60" : "",
      )}
      style={{ left, top, width, height }}
    >
      <div className="flex h-full min-h-0 gap-2.5">
        <img
          src={event.place?.imageUrl || `https://picsum.photos/seed/${event.externalPlaceId}/96/96`}
          alt={event.place?.name || "Địa điểm"}
          className="h-full min-h-9 max-h-16 w-16 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <h3 className="line-clamp-2 flex-1 font-bold leading-tight text-foreground">
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
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
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

function isTimelineDay(day: Date, timelineStart: Date, timelineEnd: Date) {
  const currentDay = dateOnly(day).getTime();
  return currentDay >= timelineStart.getTime() && currentDay <= timelineEnd.getTime();
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
