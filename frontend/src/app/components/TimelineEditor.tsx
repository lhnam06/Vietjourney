import { useEffect, useMemo, useRef, useState, type DragEvent, type PointerEvent } from "react";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  Sparkles,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { PlaceList } from "../App";
import { getAuthToken } from "../lib/authApi";
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
  fetchPendingTimelineProposals,
  fetchTimelineEvents,
  moveTimelineEvent,
  resizeTimelineEvent,
  submitTimelineProposal,
  type CurrentUser,
  type Timeline,
  type TimelineEvent,
  type TimelineEventCategory,
  type TimelineMemberRole,
  type TimelineProposal,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";
import { useTimelineSocket } from "../hooks/useTimelineSocket";
import { AgentPanel } from "./AgentPanel";
import { ChatPanel } from "./ChatPanel";
import { NewListModal } from "./Popups";
import { listIcon } from "./ListPanel";
import { ProposalDrawer } from "./ProposalDrawer";
import { ProposalGhostCard } from "./ProposalGhostCard";

const dayLabels = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];
const hours = Array.from({ length: 24 }, (_, index) => index);
const hourHeight = 56;
const calendarHeaderHeight = 88;
const timeColumnWidth = 86;
const dayColumnWidth = "minmax(0,1fr)";
const eventCardInset = 7;
const edgeSwitchZone = 50;
const edgeSwitchDelay = 500;
const dragAutoScrollZone = 112;
const dragAutoScrollMaxSpeed = 14;
const defaultDropDurationMinutes = 90;
const snapMinutes = 15;
const optimisticEventPrefix = "optimistic-event-";
const realtimeRefreshTypes = new Set([
  "TIMELINE_EVENTS_CHANGED",
  "TIMELINE_UPDATED",
  "EVENT_ADDED",
  "EVENT_MOVED",
  "EVENT_RESIZED",
  "EVENT_REORDERED",
  "EVENT_DELETED",
  "PROPOSAL_CREATED",
  "PROPOSAL_UPDATED",
  "PROPOSAL_DECIDED",
]);
const proposalRefreshTypes = new Set(["PROPOSAL_CREATED", "PROPOSAL_UPDATED", "PROPOSAL_DECIDED"]);
const realtimeFallbackPollMs = 3000;

const eventCategoryTone: Record<TimelineEventCategory, {
  accent: string;
  card: string;
  glow: string;
  pill: string;
}> = {
  FOOD: {
    accent: "bg-cyan-500",
    card: "border-border/70",
    glow: "shadow-slate-950/10",
    pill: "text-muted-foreground",
  },
  DRINK: {
    accent: "bg-sky-500",
    card: "border-border/70",
    glow: "shadow-slate-950/10",
    pill: "text-muted-foreground",
  },
  ACTIVITY: {
    accent: "bg-amber-500",
    card: "border-border/70",
    glow: "shadow-slate-950/10",
    pill: "text-muted-foreground",
  },
};

type DragPayload =
  | { kind: "place"; placeId: string }
  | { kind: "event"; eventId: string };

interface ResizeState {
  eventId: string;
  startY: number;
  initialEnd: Date;
  previewEnd: Date;
}

interface DropPreview {
  dayKey: string;
  start: Date;
  end: Date;
  topPct: number;
}

interface TimelineEditorProps {
  timeline: Timeline;
  currentUser: CurrentUser | null;
  placeLists: PlaceList[];
  activeListId: string;
  onSelectList: (listId: string) => void;
  onCreateList: (name: string, icon?: string) => void;
  onBack: () => void;
}

export function TimelineEditor({
  timeline,
  currentUser,
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
  const [notice, setNotice] = useState<string | null>(null);
  const [edgeHint, setEdgeHint] = useState<"previous" | "next" | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [isNewListOpen, setIsNewListOpen] = useState(false);
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);
  const [draggedPlaceId, setDraggedPlaceId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [deleteZoneActive, setDeleteZoneActive] = useState(false);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isProposalDrawerOpen, setIsProposalDrawerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [proposalRefreshVersion, setProposalRefreshVersion] = useState(0);
  const [pendingProposals, setPendingProposals] = useState<TimelineProposal[]>([]);
  const [suggestingPlaceId, setSuggestingPlaceId] = useState<string | null>(null);
  const edgeSwitchRef = useRef<number | null>(null);
  const edgeSwitchDirectionRef = useRef<"previous" | "next" | null>(null);
  const realtimeRefreshTimerRef = useRef<number | null>(null);
  const dropPreviewFrameRef = useRef<number | null>(null);
  const pendingDropPreviewRef = useRef<DropPreview | null>(null);
  const calendarScrollRef = useRef<HTMLDivElement | null>(null);
  const autoScrollFrameRef = useRef<number | null>(null);
  const dragPointerYRef = useRef<number | null>(null);
  const hasEnteredCalendarRef = useRef(false);
  const authToken = useMemo(() => getAuthToken(), []);
  const { isConnected: isRealtimeConnected, lastMessage: realtimeMessage } = useTimelineSocket(timeline.id, authToken);
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
  const today = dateOnly(new Date());
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );
  const savedPlaceCards = activeList?.places || [];
  const placeById = useMemo(
    () => new Map(savedPlaceCards.map((place) => [place.id, place])),
    [savedPlaceCards],
  );
  const currentRole = useMemo<TimelineMemberRole | null>(() => {
    if (!currentUser) return null;
    if (timeline.ownerId === currentUser.id || timeline.ownerUsername === currentUser.username) {
      return "OWNER";
    }

    return (
      timeline.members.find(
        (member) => member.userId === currentUser.id || member.username === currentUser.username,
      )?.role || null
    );
  }, [currentUser, timeline.members, timeline.ownerId, timeline.ownerUsername]);
  const canEditTimeline = currentRole === "OWNER" || currentRole === "EDITOR";
  const canRequestAdditions = currentRole === "VIEWER";
  const canReviewProposals = canEditTimeline;
  const proposalBaseVersion = useMemo(
    () => Math.max(1, ...events.map((event) => event.version || 1)),
    [events],
  );
  const roleLabel =
    currentRole === "OWNER"
      ? "Chủ chuyến đi"
      : currentRole === "EDITOR"
        ? "Có quyền chỉnh sửa"
        : currentRole === "VIEWER"
          ? "Chỉ gửi yêu cầu"
          : "Đang kiểm tra quyền";
  const permissionHint = canEditTimeline
    ? "Bạn có thể thêm, di chuyển, đổi thời lượng và xóa hoạt động trực tiếp."
    : canRequestAdditions
      ? "Bạn có thể kéo địa điểm vào lịch để gửi yêu cầu cho chủ chuyến đi hoặc biên tập viên duyệt."
      : "Bạn chưa có quyền chỉnh sửa lịch trình này.";
  const roleBadgeClass = canEditTimeline
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : canRequestAdditions
      ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-border bg-muted text-muted-foreground";
  const draggedEvent = draggedEventId ? eventById.get(draggedEventId) : null;
  const draggedPlace = draggedPlaceId ? placeById.get(draggedPlaceId) : null;
  const dropPreviewCategory = draggedEvent?.category || toEventCategory(draggedPlace?.category);
  const dropPreviewTitle = draggedEvent?.place?.name || draggedPlace?.name || "Địa điểm";
  const dropPreviewArea =
    draggedEvent?.place?.district ||
    draggedEvent?.place?.address ||
    draggedPlace?.district ||
    draggedPlace?.address ||
    categoryLabel(dropPreviewCategory);

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
    if (!currentRole) {
      setPendingProposals([]);
      return undefined;
    }

    const controller = new AbortController();

    fetchPendingTimelineProposals(timeline.id, controller.signal)
      .then(setPendingProposals)
      .catch(() => {
        if (!controller.signal.aborted && canReviewProposals) {
          setNotice("Không tải được danh sách yêu cầu đang chờ.");
        }
      });

    return () => controller.abort();
  }, [canReviewProposals, currentRole, timeline.id]);

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

  useEffect(
    () => () => {
      clearEdgeSwitchTimer();
      if (realtimeRefreshTimerRef.current) {
        window.clearTimeout(realtimeRefreshTimerRef.current);
      }
      clearDropPreviewFrame();
      stopCalendarAutoScroll();
    },
    [],
  );

  useEffect(() => {
    if (!draggedPlaceId && !draggedEventId) return undefined;

    function onWindowDragOver(event: globalThis.DragEvent) {
      const container = calendarScrollRef.current;
      if (!container) return;

      if (hasEnteredCalendarRef.current) {
        scheduleEdgeWeekSwitch(event.clientX, container);
      }

      const rect = container.getBoundingClientRect();
      const horizontalGrace = 160;
      const isNearTimelineHorizontally =
        event.clientX >= rect.left - horizontalGrace &&
        event.clientX <= rect.right + horizontalGrace;

      if (!isNearTimelineHorizontally) {
        stopCalendarAutoScroll();
        return;
      }

      updateCalendarAutoScroll(event.clientY);
    }

    window.addEventListener("dragover", onWindowDragOver, true);
    return () => {
      window.removeEventListener("dragover", onWindowDragOver, true);
      clearEdgeSwitchTimer();
      stopCalendarAutoScroll();
    };
  }, [draggedEventId, draggedPlaceId, weekStart]);

  async function reloadEvents() {
    const nextEvents = await fetchTimelineEvents(timeline.id, rangeStart, rangeEnd);
    setEvents(nextEvents);
  }

  async function reloadProposals() {
    if (!currentRole) return;
    const proposals = await fetchPendingTimelineProposals(timeline.id);
    setPendingProposals(proposals);
  }

  async function refreshTimelineFromDatabase(options: {
    includeProposals?: boolean;
    actor?: string | null;
    showNotice?: boolean;
  } = {}) {
    await reloadEvents();
    if (options.includeProposals) {
      await reloadProposals();
      setProposalRefreshVersion((current) => current + 1);
    }
    if (options.showNotice && options.actor && options.actor !== currentUser?.username) {
      setNotice("Timeline vừa được cập nhật bởi thành viên khác. Dữ liệu mới nhất đã được tải lại.");
    }
  }

  async function handleProposalDrawerChanged(message: string, eventsChanged: boolean) {
    if (eventsChanged) {
      await reloadEvents();
    }
    await reloadProposals();
    setProposalRefreshVersion((current) => current + 1);
    setNotice(message);
  }

  useEffect(() => {
    if (!realtimeMessage) return;

    const message = realtimeMessage as Record<string, unknown>;
    const messageData = message.data && typeof message.data === "object" ? message.data as Record<string, unknown> : {};
    const messageType =
      typeof message.type === "string"
        ? message.type
        : typeof messageData.type === "string"
          ? messageData.type
          : typeof messageData.changeType === "string"
            ? messageData.changeType
            : "";
    if (!realtimeRefreshTypes.has(messageType)) return;

    const messageTimelineId =
      typeof messageData.timelineId === "string"
        ? messageData.timelineId
        : typeof message.timelineId === "string"
          ? message.timelineId
          : null;
    if (messageTimelineId && messageTimelineId !== timeline.id) return;

    if (realtimeRefreshTimerRef.current) {
      window.clearTimeout(realtimeRefreshTimerRef.current);
    }

    realtimeRefreshTimerRef.current = window.setTimeout(() => {
      realtimeRefreshTimerRef.current = null;
      void (async () => {
        try {
          const actor =
            typeof messageData.actor === "string"
              ? messageData.actor
              : typeof message.actor === "string"
                ? message.actor
                : null;
          await refreshTimelineFromDatabase({
            actor,
            includeProposals: proposalRefreshTypes.has(messageType) || messageType === "TIMELINE_EVENTS_CHANGED",
            showNotice: true,
          });
        } catch (refreshError) {
          setError(refreshError instanceof Error ? refreshError.message : "Không đồng bộ được timeline mới nhất.");
        }
      })();
    }, 180);
  }, [currentUser?.username, realtimeMessage, timeline.id]);

  useEffect(() => {
    if (isRealtimeConnected) return undefined;

    let refreshing = false;
    const intervalId = window.setInterval(() => {
      if (refreshing) return;
      refreshing = true;
      void refreshTimelineFromDatabase({ includeProposals: true })
        .catch((refreshError) => {
          setError(refreshError instanceof Error ? refreshError.message : "Không đồng bộ được timeline mới nhất.");
        })
        .finally(() => {
          refreshing = false;
        });
    }, realtimeFallbackPollMs);

    return () => window.clearInterval(intervalId);
  }, [isRealtimeConnected, rangeEnd, rangeStart, timeline.id, currentRole]);

  function changeWeek(offset: number) {
    const nextStart = addDays(weekStart, offset * 7);
    if (nextStart > timelineEnd || addDays(nextStart, 6) < timelineStart) {
      return;
    }
    setWeekStart(nextStart);
  }

  function canChangeWeek(offset: number) {
    const nextStart = addDays(weekStart, offset * 7);
    return !(nextStart > timelineEnd || addDays(nextStart, 6) < timelineStart);
  }

  function clearEdgeSwitchTimer() {
    if (edgeSwitchRef.current) {
      window.clearTimeout(edgeSwitchRef.current);
      edgeSwitchRef.current = null;
    }
    edgeSwitchDirectionRef.current = null;
    setEdgeHint(null);
  }

  function clearDropPreviewFrame() {
    if (dropPreviewFrameRef.current) {
      window.cancelAnimationFrame(dropPreviewFrameRef.current);
      dropPreviewFrameRef.current = null;
    }
    pendingDropPreviewRef.current = null;
  }

  function clearDropPreview() {
    clearDropPreviewFrame();
    setDropPreview(null);
  }

  function runAfterNextPaint(task: () => void) {
    window.requestAnimationFrame(() => {
      window.setTimeout(task, 0);
    });
  }

  function buildOptimisticTimelineEvent(
    place: Place,
    startTime: string,
    endTime: string,
    orderIndex: number,
  ): TimelineEvent {
    return {
      id: `${optimisticEventPrefix}${place.id}-${Date.now()}`,
      externalPlaceId: place.id,
      place: {
        id: place.id,
        name: place.name,
        address: place.address ?? null,
        rating: place.rating ?? null,
        latitude: place.latitude ?? null,
        longitude: place.longitude ?? null,
        district: place.district ?? null,
        imageUrl: placeImage(place),
      },
      category: toEventCategory(place.category),
      startTime,
      endTime,
      orderIndex,
      status: "PLANNED",
      version: 0,
    };
  }

  function replaceOptimisticEvent(optimisticId: string, nextEvent: TimelineEvent) {
    setEvents((current) => current.map((item) => (item.id === optimisticId ? nextEvent : item)));
  }

  function persistCreatedEvent(optimisticId: string, place: Place, startTime: string, endTime: string, orderIndex: number) {
    setSavingId(optimisticId);
    runAfterNextPaint(() => {
      void createTimelineEvent(timeline.id, {
        externalPlaceId: place.id,
        category: toEventCategory(place.category),
        startTime,
        endTime,
        orderIndex,
        status: "PLANNED",
      })
        .then((created) => {
          replaceOptimisticEvent(optimisticId, created);
        })
        .catch(async (createError) => {
          setEvents((current) => current.filter((item) => item.id !== optimisticId));
          setError(createError instanceof Error ? createError.message : "Khong cap nhat duoc lich trinh.");
          await reloadEvents();
        })
        .finally(() => {
          setSavingId((current) => (current === optimisticId ? null : current));
        });
    });
  }

  function persistMovedEvent(source: TimelineEvent, startTime: string, endTime: string, orderIndex?: number) {
    runAfterNextPaint(() => {
      void moveEvent(source, startTime, endTime, orderIndex).catch(async (moveError) => {
        setError(moveError instanceof Error ? moveError.message : "Khong cap nhat duoc lich trinh.");
        await reloadEvents();
      });
    });
  }

  function queueDropPreview(next: DropPreview) {
    pendingDropPreviewRef.current = next;
    if (dropPreviewFrameRef.current) return;

    dropPreviewFrameRef.current = window.requestAnimationFrame(() => {
      dropPreviewFrameRef.current = null;
      const pending = pendingDropPreviewRef.current;
      pendingDropPreviewRef.current = null;
      if (!pending) return;

      setDropPreview((current) =>
        current &&
        current.dayKey === pending.dayKey &&
        current.start.getTime() === pending.start.getTime() &&
        current.end.getTime() === pending.end.getTime()
          ? current
          : pending,
      );
    });
  }

  function stopCalendarAutoScroll() {
    dragPointerYRef.current = null;
    if (autoScrollFrameRef.current) {
      window.cancelAnimationFrame(autoScrollFrameRef.current);
      autoScrollFrameRef.current = null;
    }
  }

  function runCalendarAutoScroll() {
    const container = calendarScrollRef.current;
    const pointerY = dragPointerYRef.current;
    if (!container || pointerY == null) {
      autoScrollFrameRef.current = null;
      return;
    }

    const rect = container.getBoundingClientRect();
    const topThreshold = rect.top + dragAutoScrollZone;
    const bottomThreshold = rect.bottom - dragAutoScrollZone;
    let delta = 0;

    if (pointerY < topThreshold) {
      const intensity = clamp((topThreshold - pointerY) / dragAutoScrollZone, 0, 1);
      delta = -dragAutoScrollMaxSpeed * intensity * intensity;
    } else if (pointerY > bottomThreshold) {
      const intensity = clamp((pointerY - bottomThreshold) / dragAutoScrollZone, 0, 1);
      delta = dragAutoScrollMaxSpeed * intensity * intensity;
    }

    if (delta !== 0) {
      const previousScrollTop = container.scrollTop;
      container.scrollTop += delta;
      autoScrollFrameRef.current = container.scrollTop === previousScrollTop
        ? null
        : window.requestAnimationFrame(runCalendarAutoScroll);
    } else {
      autoScrollFrameRef.current = null;
    }
  }

  function updateCalendarAutoScroll(clientY: number) {
    dragPointerYRef.current = clientY;
    if (!autoScrollFrameRef.current) {
      autoScrollFrameRef.current = window.requestAnimationFrame(runCalendarAutoScroll);
    }
  }

  function handleDragStart(event: DragEvent, payload: DragPayload) {
    if (payload.kind === "event" && !canEditTimeline) {
      event.preventDefault();
      setNotice("Bạn chỉ có quyền xem timeline này. Hãy gửi yêu cầu nếu muốn thêm địa điểm mới.");
      return;
    }

    event.dataTransfer.setData("application/json", JSON.stringify(payload));
    event.dataTransfer.effectAllowed = payload.kind === "place" ? "copyMove" : "move";
    hasEnteredCalendarRef.current = false;
    setCardDragImage(event, payload, {
      place: payload.kind === "place" ? placeById.get(payload.placeId) : undefined,
      timelineEvent: payload.kind === "event" ? eventById.get(payload.eventId) : undefined,
    });

    window.setTimeout(() => {
      if (payload.kind === "place") {
        setDraggedPlaceId(payload.placeId);
        setDraggedEventId(null);
      } else {
        setDraggedEventId(payload.eventId);
        setDraggedPlaceId(null);
      }
      clearDropPreview();
    }, 0);
  }

  function handleDragEnd() {
    hasEnteredCalendarRef.current = false;
    setDraggedPlaceId(null);
    setDraggedEventId(null);
    setDeleteZoneActive(false);
    clearDropPreview();
    clearEdgeSwitchTimer();
    stopCalendarAutoScroll();
  }

  function scheduleEdgeWeekSwitch(clientX: number, container: HTMLElement) {
    if (!draggedPlaceId && !draggedEventId) return;

    const rect = container.getBoundingClientRect();
    let direction: "previous" | "next" | null = null;

    if (clientX <= rect.left + edgeSwitchZone && canChangeWeek(-1)) {
      direction = "previous";
    } else if (clientX >= rect.right - edgeSwitchZone && canChangeWeek(1)) {
      direction = "next";
    }

    if (!direction) {
      clearEdgeSwitchTimer();
      return;
    }

    setEdgeHint(direction);
    if (edgeSwitchRef.current && edgeSwitchDirectionRef.current === direction) return;

    if (edgeSwitchRef.current) {
      window.clearTimeout(edgeSwitchRef.current);
      edgeSwitchRef.current = null;
    }

    edgeSwitchDirectionRef.current = direction;
    edgeSwitchRef.current = window.setTimeout(() => {
      changeWeek(direction === "previous" ? -1 : 1);
      clearDropPreview();
      edgeSwitchRef.current = null;
      edgeSwitchDirectionRef.current = null;
      setEdgeHint(null);
    }, edgeSwitchDelay);
  }

  function handleCalendarDragOver(event: DragEvent) {
    event.preventDefault();
    if (draggedEventId && !canEditTimeline) {
      event.dataTransfer.dropEffect = "none";
      return;
    }
    hasEnteredCalendarRef.current = true;
    event.dataTransfer.dropEffect = draggedEventId ? "move" : "copy";
    scheduleEdgeWeekSwitch(event.clientX, event.currentTarget);
    updateCalendarAutoScroll(event.clientY);
  }

  function handleDragLeave(event: DragEvent) {
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    clearDropPreview();
  }

  function dropWindowFor(day: Date, target: HTMLElement, clientY: number, durationMinutes: number) {
    const rect = target.getBoundingClientRect();
    const percent = clamp((clientY - rect.top) / rect.height, 0, 1);
    const rawMinutes = percent * 24 * 60;
    const maxStart = 24 * 60 - durationMinutes;
    const startMinutes = clamp(Math.round(rawMinutes / snapMinutes) * snapMinutes, 0, maxStart);
    const endMinutes = Math.min(startMinutes + durationMinutes, 24 * 60 - 1);

    return {
      start: dateAtMinutes(day, startMinutes),
      end: dateAtMinutes(day, endMinutes),
      topPct: (startMinutes / (24 * 60)) * 100,
    };
  }

  function previewColumnDrop(event: DragEvent, day: Date) {
    if (!canDropOnDay(day)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = draggedEventId ? "move" : "copy";

    const source = draggedEventId ? eventById.get(draggedEventId) : null;
    const duration = source
      ? Math.max(snapMinutes, differenceMinutes(new Date(source.endTime), new Date(source.startTime)))
      : defaultDropDurationMinutes;
    const next = dropWindowFor(day, event.currentTarget, event.clientY, duration);
    const dayKey = day.toISOString();

    queueDropPreview({ dayKey, ...next });
  }

  async function requestAddPlace(place: Place, day: Date, startTime: string, endTime: string) {
    const payload = {
      externalPlaceId: place.id,
      category: toEventCategory(place.category),
      startTime,
      endTime,
      orderIndex: dayEvents(day).length,
      status: "PLANNED",
    };

    const proposal = await submitTimelineProposal(timeline.id, {
      changeType: "ADD",
      payload,
      baseVersion: proposalBaseVersion,
    });

    setPendingProposals((current) =>
      current.some((item) => item.id === proposal.id) ? current : [proposal, ...current],
    );
    setProposalRefreshVersion((current) => current + 1);
    setNotice(`Đã gửi yêu cầu thêm "${place.name}" cho người có quyền chỉnh sửa.`);
  }

  async function requestUnscheduledPlace(place: Place) {
    if (!canRequestAdditions || suggestingPlaceId) return;
    setSuggestingPlaceId(place.id);
    setError(null);
    try {
      const proposal = await submitTimelineProposal(timeline.id, {
        changeType: "ADD",
        payload: {
          externalPlaceId: place.id,
          category: toEventCategory(place.category),
          status: "PLANNED",
        },
        baseVersion: proposalBaseVersion,
      });
      setPendingProposals((current) =>
        current.some((item) => item.id === proposal.id) ? current : [proposal, ...current],
      );
      setProposalRefreshVersion((current) => current + 1);
      setNotice(`Đã gửi đề xuất "${place.name}". Người duyệt sẽ chọn thời gian phù hợp.`);
      setIsProposalDrawerOpen(true);
    } catch (proposalError) {
      setError(proposalError instanceof Error ? proposalError.message : "Không gửi được đề xuất.");
    } finally {
      setSuggestingPlaceId(null);
    }
  }

  async function handleColumnDrop(event: DragEvent, day: Date) {
    event.preventDefault();
    stopCalendarAutoScroll();
    clearEdgeSwitchTimer();
    if (!isTimelineDay(day, timelineStart, timelineEnd)) return;

    const payload = parseDragPayload(event);
    if (!payload) return;

    const source = payload.kind === "event" ? eventById.get(payload.eventId) : null;
    const duration = source
      ? Math.max(snapMinutes, differenceMinutes(new Date(source.endTime), new Date(source.startTime)))
      : defaultDropDurationMinutes;
    const next = dropWindowFor(day, event.currentTarget, event.clientY, duration);
    const start = toDateTimeInput(next.start);
    const end = toDateTimeInput(next.end);

    if (!isWithinTimeline(new Date(start), new Date(end), timelineStart, timelineEnd)) {
      setError("Khung giờ nằm ngoài thời gian của chuyến đi.");
      clearDropPreview();
      return;
    }

    try {
      setError(null);
      if (payload.kind === "place") {
        const place = placeById.get(payload.placeId);
        if (!place) return;

        if (!canEditTimeline) {
          if (canRequestAdditions) {
            await requestAddPlace(place, day, start, end);
          } else {
            setNotice("Bạn chưa có quyền thêm địa điểm vào timeline này.");
          }
          setDraggedPlaceId(null);
          setDeleteZoneActive(false);
          setDropPreview(null);
          return;
        }

        const orderIndex = dayEvents(day).length;
        const optimisticEvent = buildOptimisticTimelineEvent(place, start, end, orderIndex);
        setEvents((current) => [...current, optimisticEvent]);
        setDraggedPlaceId(null);
        setDeleteZoneActive(false);
        clearDropPreview();
        persistCreatedEvent(optimisticEvent.id, place, start, end, orderIndex);
        return;
      }

      if (!canEditTimeline) {
        setNotice("Bạn chỉ có quyền xem timeline này, không thể di chuyển hoạt động.");
        return;
      }

      if (!source) return;
      setEvents((current) =>
        current.map((item) =>
          item.id === source.id ? { ...item, startTime: start, endTime: end } : item,
        ),
      );
      setDraggedEventId(null);
      setDeleteZoneActive(false);
      clearDropPreview();
      persistMovedEvent(source, start, end, dayEvents(day).length);
    } catch (dropError) {
      setError(dropError instanceof Error ? dropError.message : "Không cập nhật được lịch trình.");
      clearDropPreview();
      await reloadEvents();
    }
  }

  async function handleDeleteZoneDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    stopCalendarAutoScroll();
    clearEdgeSwitchTimer();
    if (!canEditTimeline) {
      setNotice("Bạn chỉ có quyền xem timeline này, không thể xóa hoạt động.");
      return;
    }
    const payload = parseDragPayload(event);
    const eventId = payload?.kind === "event" ? payload.eventId : draggedEventId;
    if (!eventId) return;

    setDraggedEventId(null);
    setDeleteZoneActive(false);
    clearDropPreview();
    await removeEvent(eventId);
  }

  async function handleDrop(event: DragEvent, day: Date, hour: number) {
    event.preventDefault();
    stopCalendarAutoScroll();
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
        if (!canEditTimeline) {
          if (canRequestAdditions) {
            await requestAddPlace(place, day, start, end);
          } else {
            setNotice("Bạn chưa có quyền thêm địa điểm vào timeline này.");
          }
          return;
        }
        const orderIndex = dayEvents(day).length;
        const optimisticEvent = buildOptimisticTimelineEvent(place, start, end, orderIndex);
        setEvents((current) => [...current, optimisticEvent]);
        persistCreatedEvent(optimisticEvent.id, place, start, end, orderIndex);
        return;
      }

      if (!canEditTimeline) {
        setNotice("Bạn chỉ có quyền xem timeline này, không thể di chuyển hoạt động.");
        return;
      }

      const source = eventById.get(payload.eventId);
      if (!source) return;
      const duration = differenceMinutes(new Date(source.endTime), new Date(source.startTime));
      const movedEnd = toDateTimeInput(addMinutes(new Date(start), duration));
      setEvents((current) =>
        current.map((item) =>
          item.id === source.id ? { ...item, startTime: start, endTime: movedEnd } : item,
        ),
      );
      persistMovedEvent(source, start, movedEnd, dayEvents(day).length);
    } catch (dropError) {
      setError(dropError instanceof Error ? dropError.message : "Không cập nhật được lịch trình.");
      await reloadEvents();
    }
  }

  async function moveEvent(source: TimelineEvent, startTime: string, endTime: string, orderIndex?: number) {
    if (!canEditTimeline) {
      setNotice("Bạn chỉ có quyền xem timeline này, không thể di chuyển hoạt động.");
      return;
    }
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
    if (!canEditTimeline) {
      setNotice("Bạn chỉ có quyền xem timeline này, không thể đổi thời lượng.");
      return;
    }
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
    if (!canEditTimeline) {
      setNotice("Bạn chỉ có quyền xem timeline này, không thể xóa hoạt động.");
      return;
    }
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

  function dayProposals(day: Date) {
    return pendingProposals
      .filter((proposal) => {
        const start = proposalStartDate(proposal);
        return start ? sameDate(start, day) : false;
      })
      .sort((first, second) => {
        const firstStart = proposalStartDate(first)?.getTime() || 0;
        const secondStart = proposalStartDate(second)?.getTime() || 0;
        return firstStart - secondStart;
      });
  }

  function canDropOnDay(day: Date) {
    return isTimelineDay(day, timelineStart, timelineEnd) && (canEditTimeline || canRequestAdditions);
  }

  const weekRangeText = `${formatShortDate(weekDays[0])} - ${formatShortDate(weekDays[6])}`;

  return (
    <main className="min-w-0 flex-1 overflow-hidden bg-background px-4 pb-4 pt-8 lg:px-5">
      <div className={cn("grid h-[calc(100vh-3rem)] min-h-0 gap-4 transition-[grid-template-columns] duration-300", isSidebarOpen ? "xl:grid-cols-[360px_minmax(0,1fr)]" : "xl:grid-cols-[72px_minmax(0,1fr)]")}>
        <aside className={cn("flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-sm transition-all duration-300", isSidebarOpen ? "p-4" : "p-3 items-center justify-between")}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/15"
                >
                  <ArrowLeft className="size-4" />
                  Chuyến đi của tôi
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNewListOpen(true)}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5 hover:opacity-95"
                  >
                    <Plus className="size-4" />
                    Tạo mới
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-border bg-background px-4 py-3">
                <p className="text-xs text-muted-foreground">Đang chỉnh sửa</p>
                <h1 className="mt-1 truncate text-lg font-bold text-foreground">{timeline.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatShortDate(timelineStart)} - {formatShortDate(timelineEnd)}
                </p>
              </div>

              <div className="mt-3 rounded-xl border border-border bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Quyền của bạn</p>
                  <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", roleBadgeClass)}>
                    {roleLabel}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{permissionHint}</p>
              </div>

              <div className="relative mt-4">
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

              <div className="mt-3 flex items-center justify-between">
                <h2 className="font-bold text-foreground">Địa điểm đã lưu ({savedPlaceCards.length})</h2>
                {loading ? <Loader2 className="size-4 animate-spin text-primary" /> : null}
              </div>

              <div className="mt-2 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                {savedPlaceCards.map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    onDragStart={(event) => handleDragStart(event, { kind: "place", placeId: place.id })}
                    onDragEnd={handleDragEnd}
                    onSuggest={canRequestAdditions ? () => void requestUnscheduledPlace(place) : undefined}
                    suggesting={suggestingPlaceId === place.id}
                  />
                ))}
                {savedPlaceCards.length === 0 ? (
                  <div className="rounded-xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
                    Danh sách này chưa có địa điểm. Quay lại Khám phá để thêm địa điểm hoặc chọn danh sách khác.
                  </div>
                ) : null}
              </div>
              
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <PanelLeftClose className="size-5" />
                Thu gọn sidebar
              </button>
            </>
          ) : (
            <>
              <div className="flex flex-col items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={onBack}
                  className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-sm transition hover:bg-primary/15"
                  title="Chuyến đi của tôi"
                >
                  <ArrowLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsNewListOpen(true)}
                  className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90"
                  title="Tạo mới"
                >
                  <Plus className="size-5" />
                </button>
              </div>
              
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="flex size-12 w-full items-center justify-center rounded-xl border border-border bg-muted/50 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="Mở sidebar"
              >
                <PanelLeftOpen className="size-5" />
              </button>
            </>
          )}
        </aside>

        <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Lên lịch trình cho chuyến đi</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Kéo địa điểm vào khung giờ, kéo card để đổi ngày hoặc kéo mép dưới để đổi thời lượng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {currentRole ? (
                <button
                  type="button"
                  onClick={() => setIsProposalDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary transition hover:bg-primary/15"
                >
                  <Inbox className="size-4" />
                  Đề xuất
                  {pendingProposals.length ? (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                      {pendingProposals.length}
                    </span>
                  ) : null}
                </button>
              ) : null}
              <span
                className={cn(
                  "rounded-xl border px-3 py-2 text-xs font-bold",
                  isRealtimeConnected
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {isRealtimeConnected ? "Đồng bộ trực tiếp" : "Đang kết nối realtime"}
              </span>
              <div className={cn("rounded-xl border px-4 py-2 text-sm font-semibold", roleBadgeClass)}>
                {roleLabel}
              </div>
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
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          {notice ? (
            <div className="mt-4 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
              {notice}
            </div>
          ) : null}

          <div
            ref={calendarScrollRef}
            className="relative mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden rounded-3xl border border-border bg-[radial-gradient(circle_at_top_left,oklch(0.68_0.19_270_/_0.12),transparent_34%),linear-gradient(180deg,var(--card),var(--background))] shadow-inner"
            onDragOver={handleCalendarDragOver}
            onDragLeave={handleDragLeave}
          >
            {edgeHint ? (
              <div
                className={cn(
                  "pointer-events-none sticky top-4 z-[90] -mb-14 flex w-fit items-center gap-2 rounded-2xl border border-primary/35 bg-primary px-4 py-3 text-sm font-extrabold text-primary-foreground shadow-2xl shadow-primary/25 backdrop-blur",
                  edgeHint === "previous" ? "ml-4 mr-auto" : "ml-auto mr-4",
                )}
              >
                {edgeHint === "previous" ? "Tuần trước" : "Tuần tiếp theo"}
              </div>
            ) : null}

            <div
              className="relative grid w-full min-w-0"
              style={{
                gridTemplateColumns: `${timeColumnWidth}px repeat(7, ${dayColumnWidth})`,
              }}
            >
              <div
                className="sticky left-0 top-0 z-[85] flex items-center border-b border-r border-border bg-card px-5 text-sm font-semibold text-primary shadow-md"
                style={{ height: calendarHeaderHeight }}
              >
                <span className="rounded-full bg-primary/10 px-3 py-1.5">Giờ</span>
              </div>
              {weekDays.map((day, index) => {
                const available = canDropOnDay(day);
                const isToday = sameDate(day, today);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "sticky top-0 z-[80] flex flex-col items-center justify-center border-b border-r border-border px-3 text-center shadow-md",
                      available
                        ? "bg-card text-foreground"
                        : "timeline-invalid-header",
                      isToday && "timeline-today-header",
                    )}
                    style={{ height: calendarHeaderHeight }}
                  >
                    <p className={cn("text-sm font-bold", available ? "text-foreground" : "text-muted-foreground")}>
                      {dayLabels[index]}
                    </p>
                    <p className={cn("mt-1 text-sm font-medium", isToday ? "text-primary" : "text-muted-foreground")}>
                      {formatShortDate(day)}
                    </p>
                    {isToday ? (
                      <span className="mt-2 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
                        Hôm nay
                      </span>
                    ) : null}
                  </div>
                );
              })}

              {hours.map((hour) => (
                <div key={`row-${hour}`} className="contents">
                  <div
                    className="sticky left-0 z-10 border-b border-r border-border bg-card/95 px-3 py-2 text-xs font-semibold tabular-nums text-muted-foreground backdrop-blur"
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
                          "relative border-b border-r border-dashed border-border/70 transition after:absolute after:left-3 after:right-3 after:top-1/2 after:h-px after:bg-border/25 after:content-['']",
                          available
                            ? "bg-card/35 hover:bg-accent/35"
                            : "timeline-invalid-cell cursor-not-allowed",
                        )}
                        style={{ height: hourHeight }}
                      />
                    );
                  })}
                </div>
              ))}

              <div
                className="absolute right-0 z-10 grid"
                style={{
                  left: timeColumnWidth,
                  top: calendarHeaderHeight,
                  height: hours.length * hourHeight,
                  gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
                }}
              >
                {weekDays.map((day) => {
                  const available = canDropOnDay(day);
                  const preview = dropPreview?.dayKey === day.toISOString() ? dropPreview : null;

                  return (
                    <div
                      key={`drop-${day.toISOString()}`}
                      className={cn(
                        "relative border-r border-transparent",
                        available ? "pointer-events-auto" : "pointer-events-none",
                      )}
                      onDragEnter={available ? (event) => event.preventDefault() : undefined}
                      onDragOver={available ? (event) => previewColumnDrop(event, day) : undefined}
                      onDragLeave={
                        available
                          ? (event) => {
                              const next = event.relatedTarget as Node | null;
                              if (next && event.currentTarget.contains(next)) return;
                              clearDropPreviewFrame();
                              setDropPreview((current) =>
                                current?.dayKey === day.toISOString() ? null : current,
                              );
                            }
                          : undefined
                      }
                      onDrop={available ? (event) => handleColumnDrop(event, day) : undefined}
                    >
                      {preview ? (
                        <DropPreviewCard
                          preview={preview}
                          title={dropPreviewTitle}
                          area={dropPreviewArea}
                          category={dropPreviewCategory}
                        />
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <div
                className="pointer-events-none absolute right-0"
                style={{ left: timeColumnWidth, top: calendarHeaderHeight }}
              >
                {weekDays.map((day, dayIndex) =>
                  dayProposals(day).map((proposal, proposalIndex) => (
                    <ProposalGhostCard
                      key={proposal.id}
                      proposal={proposal}
                      dayIndex={dayIndex}
                      stackIndex={proposalIndex}
                      hourHeight={hourHeight}
                    />
                  )),
                )}
                {weekDays.map((day, dayIndex) =>
                  dayEvents(day).map((event) => (
                    <TimelineCard
                      key={event.id}
                      event={event}
                      dayIndex={dayIndex}
                      saving={savingId === event.id}
                      resizing={resizeState?.eventId === event.id ? resizeState.previewEnd : null}
                      isDragging={draggedEventId === event.id}
                      editable={canEditTimeline}
                      onDragStart={(dragEvent) => handleDragStart(dragEvent, { kind: "event", eventId: event.id })}
                      onDragEnd={handleDragEnd}
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

            {draggedEventId ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDeleteZoneActive(true);
                }}
                onDragLeave={() => setDeleteZoneActive(false)}
                onDrop={handleDeleteZoneDrop}
                className={cn(
                  "sticky bottom-3 z-40 mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold shadow-lg backdrop-blur transition-all",
                  deleteZoneActive
                    ? "scale-105 border-destructive bg-destructive text-destructive-foreground"
                    : "border-destructive/30 bg-card/95 text-destructive",
                )}
              >
                <Trash2 className="size-4" />
                {deleteZoneActive ? "Thả để xóa khỏi timetable" : "Kéo vào đây để xóa khỏi timetable"}
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-2xl border border-primary/10 bg-accent/55 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="size-5" />
                <span className="font-bold">Gợi ý lịch trình cho bạn</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsChatOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-background px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/5"
                >
                  <MessageSquare className="size-4" />
                  Trò chuyện
                </button>
                <button
                  type="button"
                  onClick={() => setIsAgentOpen(true)}
                  className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5"
                >
                  Tạo lịch tự động
                </button>
              </div>
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
      <AgentPanel
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
        timelineId={timeline.id}
        startDate={timeline.startDate}
        onTimelineUpdated={() => void reloadEvents()}
      />
      <ChatPanel
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        timelineId={timeline.id}
      />
      <ProposalDrawer
        open={isProposalDrawerOpen}
        timelineId={timeline.id}
        timelineStart={timeline.startDate}
        timelineEnd={timeline.endDate}
        currentRole={currentRole}
        refreshVersion={proposalRefreshVersion}
        onClose={() => setIsProposalDrawerOpen(false)}
        onChanged={handleProposalDrawerChanged}
      />
    </main>
  );
}

function PlaceCard({
  place,
  onDragStart,
  onDragEnd,
  onSuggest,
  suggesting,
}: {
  place: Place;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onSuggest?: () => void;
  suggesting: boolean;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group flex cursor-grab items-center gap-3 rounded-2xl border border-primary/15 bg-muted/70 p-3 shadow-sm ring-1 ring-border/60 transition hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/50 hover:shadow-md active:cursor-grabbing"
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
      {onSuggest ? (
        <button
          type="button"
          disabled={suggesting}
          onClick={(event) => {
            event.stopPropagation();
            onSuggest();
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Đề xuất ${place.name} chưa chọn giờ`}
          title="Đề xuất địa điểm, chọn thời gian sau"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary transition hover:bg-primary/15 disabled:opacity-60"
        >
          {suggesting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-5" />}
        </button>
      ) : null}
      <GripVertical className="size-5 shrink-0 text-muted-foreground" />
    </article>
  );
}

function TimelineCard({
  event,
  dayIndex,
  saving,
  resizing,
  isDragging,
  editable,
  onDragStart,
  onDragEnd,
  onResizeStart,
  onDelete,
}: {
  event: TimelineEvent;
  dayIndex: number;
  saving: boolean;
  resizing: Date | null;
  isDragging: boolean;
  editable: boolean;
  onDragStart: (event: DragEvent) => void;
  onDragEnd: () => void;
  onResizeStart: (event: PointerEvent) => void;
  onDelete: () => void;
}) {
  const start = new Date(event.startTime);
  const end = resizing || new Date(event.endTime);
  const top = (start.getHours() * 60 + start.getMinutes()) * (hourHeight / 60);
  const height = Math.max(38, differenceMinutes(end, start) * (hourHeight / 60));
  const width = `calc((100% / 7) - ${eventCardInset * 2}px)`;
  const left = `calc(${dayIndex} * (100% / 7) + ${eventCardInset}px)`;
  const compact = height < 70;
  const roomy = height >= 92;
  const tone = eventCategoryTone[event.category] || eventCategoryTone.ACTIVITY;
  const placeName = event.place?.name || "Địa điểm";
  const placeArea = event.place?.district || event.place?.address || categoryLabel(event.category);
  return (
    <article
      draggable={editable && !resizing}
      onDragStart={editable ? onDragStart : undefined}
      onDragEnd={editable ? onDragEnd : undefined}
      className={cn(
        "group pointer-events-auto absolute z-20 overflow-hidden rounded-2xl border bg-card text-xs shadow-xl ring-1 ring-border/60 transition hover:z-30 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-2xl",
        editable ? "cursor-grab active:cursor-grabbing" : "cursor-default",
        tone.card,
        tone.glow,
        saving ? "opacity-60" : "",
        isDragging ? "scale-[0.98] opacity-75 ring-2 ring-primary/40" : "",
      )}
      style={{ left, top, width, height }}
    >
      <div
        className={cn(
          "relative flex size-full min-w-0 flex-col overflow-hidden bg-card",
          compact ? "justify-center px-2.5 py-2" : "px-2.5 py-2",
        )}
      >
        <span className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", tone.accent)} />
        <div className={cn("flex h-full min-w-0 flex-col pl-2", compact ? "justify-center" : "justify-start")}>
          <h3
            className={cn(
              "min-w-0 text-[12px] font-extrabold leading-[1.15] text-foreground",
              compact ? "truncate" : "line-clamp-2",
            )}
          >
            {placeName}
          </h3>
          <div
            className={cn(
              "mt-1 min-w-0 truncate font-bold leading-none tabular-nums text-primary",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {formatTime(start)} - {formatTime(end)}
          </div>
          {!compact ? (
            <p className="mt-1 min-w-0 truncate text-[10.5px] font-semibold leading-tight text-muted-foreground">
              {placeArea}
            </p>
          ) : null}
          {roomy ? (
            <span className={cn("mt-1.5 block truncate text-[10px] font-bold uppercase leading-none", tone.pill)}>
              {categoryLabel(event.category)}
            </span>
          ) : null}
        </div>
      </div>
      {editable ? (
        <>
          <button
            type="button"
            onClick={onDelete}
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-lg bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Đổi thời lượng"
            onPointerDown={onResizeStart}
            className="absolute bottom-1 left-1/2 flex h-2 w-9 -translate-x-1/2 cursor-ns-resize items-center justify-center rounded-full bg-muted-foreground/25 opacity-70 shadow-sm transition hover:bg-primary/45 group-hover:opacity-100"
          >
            <span className="h-0.5 w-4 rounded-full bg-background/90" />
          </button>
        </>
      ) : null}
    </article>
  );
}

function DropPreviewCard({
  preview,
  title,
  area,
  category,
}: {
  preview: DropPreview;
  title: string;
  area: string;
  category: TimelineEventCategory;
}) {
  const height = Math.max(42, differenceMinutes(preview.end, preview.start) * (hourHeight / 60));
  const compact = height < 70;
  const roomy = height >= 92;
  const tone = eventCategoryTone[category] || eventCategoryTone.ACTIVITY;

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-2 right-2 z-30 overflow-hidden rounded-2xl border bg-card/95 text-xs shadow-2xl ring-2 ring-primary/20 backdrop-blur transition-[top,height,opacity,transform] duration-75 ease-out",
        tone.card,
      )}
      style={{ top: `${preview.topPct}%`, height, transform: "translateZ(0)" }}
    >
      <span className={cn("absolute inset-y-2 left-0 w-0.5 rounded-full", tone.accent)} />
      <div className={cn("flex size-full min-w-0 flex-col pl-4 pr-2", compact ? "justify-center py-2" : "py-2")}>
        <h4
          className={cn(
            "min-w-0 text-[12px] font-extrabold leading-[1.15] text-foreground",
            compact ? "truncate" : "line-clamp-2",
          )}
        >
          {title}
        </h4>
        <p className={cn("mt-1 truncate font-bold leading-none tabular-nums text-primary", compact ? "text-[10px]" : "text-[11px]")}>
          {formatTime(preview.start)} - {formatTime(preview.end)}
        </p>
        {!compact ? (
          <p className="mt-1 truncate text-[10.5px] font-semibold leading-tight text-muted-foreground">
            {area}
          </p>
        ) : null}
        {roomy ? (
          <p className="mt-1.5 truncate text-[10px] font-bold uppercase leading-none text-muted-foreground">
            {categoryLabel(category)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function parseDragPayload(event: DragEvent): DragPayload | null {
  try {
    return JSON.parse(event.dataTransfer.getData("application/json")) as DragPayload;
  } catch {
    return null;
  }
}

function proposalStartDate(proposal: TimelineProposal) {
  const value = proposal.payload.startTime;
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function setCardDragImage(
  event: DragEvent,
  payload: DragPayload,
  source: { place?: Place; timelineEvent?: TimelineEvent },
) {
  if (typeof document === "undefined") return;

  const isPlace = payload.kind === "place";
  const category = source.timelineEvent?.category || toEventCategory(source.place?.category);
  const tone = eventCategoryTone[category] || eventCategoryTone.ACTIVITY;
  const title = source.timelineEvent?.place?.name || source.place?.name || "Địa điểm";
  const area =
    source.timelineEvent?.place?.district ||
    source.timelineEvent?.place?.address ||
    source.place?.district ||
    source.place?.address ||
    categoryLabel(category);
  const start = source.timelineEvent ? new Date(source.timelineEvent.startTime) : null;
  const end = source.timelineEvent ? new Date(source.timelineEvent.endTime) : null;
  const defaultHours = Math.floor(defaultDropDurationMinutes / 60);
  const defaultMinutes = defaultDropDurationMinutes % 60;
  const timeText = start && end
    ? `${formatTime(start)} - ${formatTime(end)}`
    : `+ ${defaultHours}h${defaultMinutes ? String(defaultMinutes).padStart(2, "0") : ""}`;

  const dragImage = document.createElement("div");
  dragImage.className = "rounded-2xl border border-border bg-card text-xs shadow-2xl ring-2 ring-primary/20";
  dragImage.style.position = "fixed";
  dragImage.style.left = "-1000px";
  dragImage.style.top = "-1000px";
  dragImage.style.width = isPlace ? "154px" : "144px";
  dragImage.style.minHeight = isPlace ? "88px" : "76px";
  dragImage.style.padding = "10px 12px 10px 14px";
  dragImage.style.overflow = "hidden";
  dragImage.style.pointerEvents = "none";
  dragImage.style.opacity = "0.98";
  dragImage.style.transform = "translateZ(0)";

  const accent = document.createElement("span");
  accent.className = tone.accent;
  accent.style.position = "absolute";
  accent.style.left = "0";
  accent.style.top = "10px";
  accent.style.bottom = "10px";
  accent.style.width = "2px";
  accent.style.borderRadius = "999px";

  const titleEl = document.createElement("div");
  titleEl.textContent = title;
  titleEl.style.fontSize = "12px";
  titleEl.style.fontWeight = "800";
  titleEl.style.lineHeight = "1.15";
  titleEl.style.color = "var(--foreground)";
  titleEl.style.display = "-webkit-box";
  titleEl.style.setProperty("-webkit-line-clamp", "2");
  titleEl.style.setProperty("-webkit-box-orient", "vertical");
  titleEl.style.overflow = "hidden";

  const timeEl = document.createElement("div");
  timeEl.textContent = timeText;
  timeEl.style.marginTop = "6px";
  timeEl.style.fontSize = "11px";
  timeEl.style.fontWeight = "800";
  timeEl.style.lineHeight = "1";
  timeEl.style.color = "var(--primary)";

  const areaEl = document.createElement("div");
  areaEl.textContent = area;
  areaEl.style.marginTop = "6px";
  areaEl.style.fontSize = "10.5px";
  areaEl.style.fontWeight = "600";
  areaEl.style.lineHeight = "1.1";
  areaEl.style.color = "var(--muted-foreground)";
  areaEl.style.whiteSpace = "nowrap";
  areaEl.style.overflow = "hidden";
  areaEl.style.textOverflow = "ellipsis";

  dragImage.append(accent, titleEl, timeEl, areaEl);
  document.body.appendChild(dragImage);
  event.dataTransfer.setDragImage(dragImage, 24, 24);
  window.setTimeout(() => dragImage.remove(), 0);
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

function dateAtMinutes(date: Date, minutes: number) {
  const next = dateOnly(date);
  next.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
