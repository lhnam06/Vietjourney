import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bookmark,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  Clipboard,
  Compass,
  Copy,
  Edit3,
  FileText,
  Grid2X2,
  Link2,
  List,
  Loader2,
  Lock,
  Map,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  createTimeline,
  createTimelineEvent,
  deleteTimeline,
  duplicateTimeline,
  fetchCurrentUser,
  fetchMyTimelines,
  fetchRecentNotifications,
  joinTimelineByCode,
  removeTimelineMember,
  resetTimelineInviteCode,
  tripCoverImage,
  updateTimeline,
  upsertTimelineMember,
  type CurrentUser,
  type InviteCodeResult,
  type NotificationItem,
  type Timeline,
  type TimelineInput,
  type TimelineMemberRole,
  type TimelineVisibility,
} from "../lib/timelineApi";
import {
  categoryFilter,
  fetchPlaces,
  placeImage,
  type Place,
} from "../lib/placesApi";
import { fetchRecommendedPlaces } from "../lib/recommendationApi";
import { cn } from "../lib/utils";

type TripModal = "create" | "join" | "edit" | "invite" | "members" | null;
type StartMethod = "ai" | "explore" | "blank";

interface MyTripsProps {
  savedPlaces?: Place[];
  onExplore?: () => void;
  onOpenNotifications?: () => void;
  onEditTimeline?: (timeline: Timeline) => void;
  onViewMap?: (timeline: Timeline) => void;
}

const today = new Date();
const todayIso = toDateInput(today);
const defaultEndIso = toDateInput(addDays(today, 2));

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function dayCount(startDate: string, endDate: string) {
  const start = dateOnly(startDate).getTime();
  const end = dateOnly(endDate).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateOnly(value));
}

function formatDateRange(timeline: Timeline) {
  return `${formatDate(timeline.startDate)} - ${formatDate(timeline.endDate)}`;
}

function progressForTimeline(timeline: Timeline) {
  const start = dateOnly(timeline.startDate).getTime();
  const end = dateOnly(timeline.endDate).getTime();
  const now = dateOnly(todayIso).getTime();

  if (now < start) return 0;
  if (now > end) return 100;

  return Math.max(10, Math.round(((now - start + 86400000) / (end - start + 86400000)) * 100));
}

function timelineStatus(timeline: Timeline) {
  const start = dateOnly(timeline.startDate).getTime();
  const end = dateOnly(timeline.endDate).getTime();
  const now = dateOnly(todayIso).getTime();

  if (now < start) return { label: "Đã lên kế hoạch", className: "bg-blue-600 text-white" };
  if (now > end) return { label: "Đã hoàn thành", className: "bg-emerald-600 text-white" };
  return { label: "Đang lập lịch", className: "bg-emerald-500 text-white" };
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function memberInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "U";
}

function timelineBudget(timeline: Timeline) {
  const estimated = timeline.events.length * 550000;
  if (!estimated) return "Chưa có";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(estimated);
}

function timelineInputFromTimeline(timeline?: Timeline): TimelineInput {
  return {
    title: timeline?.title || "",
    description: timeline?.description || "",
    startDate: timeline?.startDate || todayIso,
    endDate: timeline?.endDate || defaultEndIso,
    visibility: timeline?.visibility || "SHARED",
  };
}

function uniquePlaceCount(timeline: Timeline) {
  return new Set(timeline.events.map((event) => event.externalPlaceId)).size;
}

function placeCategory(place: Place) {
  if (place.category === "FOOD" || place.category === "DRINK" || place.category === "ACTIVITY") {
    return place.category;
  }

  return "ACTIVITY";
}

function makeEventWindow(startDate: string, index: number) {
  const day = addDays(dateOnly(startDate), Math.floor(index / 3));
  const slot = index % 3;
  const startHour = [9, 13, 18][slot];
  const endHour = startHour + 2;
  const date = toDateInput(day);

  return {
    startTime: `${date}T${String(startHour).padStart(2, "0")}:00:00`,
    endTime: `${date}T${String(endHour).padStart(2, "0")}:00:00`,
  };
}

export function MyTrips({
  savedPlaces = [],
  onExplore,
  onOpenNotifications,
  onEditTimeline,
  onViewMap,
}: MyTripsProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [recommendedPlaces, setRecommendedPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [modal, setModal] = useState<TripModal>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<Timeline | null>(null);
  const [inviteResult, setInviteResult] = useState<InviteCodeResult | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  async function loadDashboard(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const [nextUser, nextTimelines, nextNotifications] = await Promise.all([
        fetchCurrentUser(signal),
        fetchMyTimelines(signal),
        fetchRecentNotifications(signal).catch(() => []),
      ]);

      setUser(nextUser);
      setTimelines(nextTimelines);
      setNotifications(nextNotifications);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không tải được chuyến đi.");
      setTimelines([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadDashboard(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchRecommendedPlaces(4, controller.signal)
      .then(setRecommendedPlaces)
      .catch(() => setRecommendedPlaces([]));

    return () => controller.abort();
  }, []);

  const sortedTimelines = useMemo(
    () =>
      [...timelines].sort(
        (first, second) =>
          dateOnly(second.startDate).getTime() - dateOnly(first.startDate).getTime(),
      ),
    [timelines],
  );

  const recentTimeline = useMemo(
    () =>
      sortedTimelines.find((timeline) => progressForTimeline(timeline) < 100) ||
      sortedTimelines[0] ||
      null,
    [sortedTimelines],
  );

  function openEdit(timeline: Timeline) {
    setSelectedTimeline(timeline);
    setOpenMenuId(null);
    setModal("edit");
  }

  async function openInvite(timeline: Timeline) {
    setSelectedTimeline(timeline);
    setOpenMenuId(null);
    setModal("invite");
    setInviteResult(null);

    if (timeline.activeInviteCode) {
      setInviteResult({
        code: timeline.activeInviteCode,
        role: "EDITOR",
        maxUses: 0,
        expiresAt: "",
      });
    }
  }

  function openMembers(timeline: Timeline) {
    setSelectedTimeline(timeline);
    setOpenMenuId(null);
    setModal("members");
  }

  async function duplicateTrip(timeline: Timeline) {
    setOpenMenuId(null);
    setActionMessage(null);
    setError(null);

    try {
      const duplicated = await duplicateTimeline(timeline.id);
      setActionMessage(`Đã nhân bản "${duplicated.title}".`);
      await loadDashboard();
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Không nhân bản được chuyến đi.");
    }
  }

  async function deleteTrip(timeline: Timeline) {
    setOpenMenuId(null);
    const confirmed = window.confirm(`Xóa chuyến đi "${timeline.title}"? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    setActionMessage(null);
    setError(null);

    try {
      await deleteTimeline(timeline.id);
      setActionMessage(`Đã xóa chuyến đi "${timeline.title}".`);
      await loadDashboard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Không xóa được chuyến đi.");
    }
  }

  const displayName = user?.displayName || user?.username || "bạn";

  return (
    <>
      <main className="min-w-0 flex-1 overflow-y-auto bg-background px-5 pb-6 pt-10 lg:px-8">
        <div className="mx-auto grid max-w-[1480px] gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="min-w-0">
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  Xin chào, {displayName}! <span aria-hidden="true">👋</span>
                </h1>
                <p className="mt-2 text-muted-foreground">
                  Sẵn sàng cho những hành trình mới?
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModal("create")}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_oklch(0.515_0.22_277_/_0.22)] transition-all hover:-translate-y-0.5"
                >
                  <Plus className="size-4" />
                  Tạo chuyến đi mới
                </button>
                <button
                  type="button"
                  aria-label="Mở thông báo"
                  onClick={onOpenNotifications}
                  className="relative flex size-11 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Bell className="size-5" />
                  {notifications.length ? (
                    <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-white">
                      {Math.min(notifications.length, 9)}
                    </span>
                  ) : null}
                </button>
              </div>
            </header>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <QuickAction icon={Plus} title="Tạo chuyến đi" subtitle="Lên kế hoạch mới" onClick={() => setModal("create")} />
              <QuickAction icon={Compass} title="Khám phá" subtitle="Tìm địa điểm" tone="green" onClick={onExplore} />
              <QuickAction icon={Bot} title="AI Planner" subtitle="Gợi ý lịch trình" tone="sky" onClick={() => setModal("create")} />
              <QuickAction icon={Users} title="Tham gia bằng mã" subtitle="Nhập mã chuyến đi" tone="amber" onClick={() => setModal("join")} />
            </div>

            {error ? (
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-card p-5 text-sm text-destructive shadow-sm">
                {error}
              </div>
            ) : null}

            {actionMessage ? (
              <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 text-sm font-medium text-emerald-700 shadow-sm">
                {actionMessage}
              </div>
            ) : null}

            {loading ? (
              <DashboardSkeleton />
            ) : (
              <>
                {recentTimeline ? (
                  <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground">
                        Tiếp tục chuyến đi gần đây
                      </h2>
                      <TripMenuButton
                        timeline={recentTimeline}
                        isOpen={openMenuId === `recent:${recentTimeline.id}`}
                        onToggle={() =>
                          setOpenMenuId(
                            openMenuId === `recent:${recentTimeline.id}` ? null : `recent:${recentTimeline.id}`,
                          )
                        }
                        onEdit={() => openEdit(recentTimeline)}
                        onEditTimeline={() => {
                          setOpenMenuId(null);
                          onEditTimeline?.(recentTimeline);
                        }}
                        onViewMap={() => {
                          setOpenMenuId(null);
                          onViewMap?.(recentTimeline);
                        }}
                        onMembers={() => openMembers(recentTimeline)}
                        onInvite={() => openInvite(recentTimeline)}
                        onDuplicate={() => void duplicateTrip(recentTimeline)}
                        onDelete={() => void deleteTrip(recentTimeline)}
                      />
                    </div>
                    <FeaturedTrip
                      timeline={recentTimeline}
                      onEditTimeline={() => onEditTimeline?.(recentTimeline)}
                      onViewMap={() => onViewMap?.(recentTimeline)}
                      onInvite={() => openInvite(recentTimeline)}
                    />
                  </section>
                ) : (
                  <EmptyTripState onCreate={() => setModal("create")} />
                )}

                <section className="mt-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-lg font-bold text-foreground">Tất cả chuyến đi</h2>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-accent">
                        Sắp xếp: Mới nhất
                        <ChevronDown className="size-4" />
                      </button>
                      <div className="flex rounded-xl border border-primary/20 bg-primary/10 p-1 shadow-sm">
                        <button
                          type="button"
                          aria-label="Xem dạng lưới"
                          onClick={() => setViewMode("grid")}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg",
                            viewMode === "grid" ? "bg-primary text-primary-foreground shadow-sm" : "text-primary/70 hover:bg-card",
                          )}
                        >
                          <Grid2X2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Xem dạng danh sách"
                          onClick={() => setViewMode("list")}
                          className={cn(
                            "flex size-9 items-center justify-center rounded-lg",
                            viewMode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-primary/70 hover:bg-card",
                          )}
                        >
                          <List className="size-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      "mt-4 grid gap-4",
                      viewMode === "grid"
                        ? "sm:grid-cols-2 2xl:grid-cols-4"
                        : "grid-cols-1",
                    )}
                  >
                    {sortedTimelines.map((timeline) => (
                      <TripCard
                        key={timeline.id}
                        timeline={timeline}
                        listMode={viewMode === "list"}
                        menuOpen={openMenuId === `card:${timeline.id}`}
                        onToggleMenu={() =>
                          setOpenMenuId(openMenuId === `card:${timeline.id}` ? null : `card:${timeline.id}`)
                        }
                        onEdit={() => openEdit(timeline)}
                        onEditTimeline={() => {
                          setOpenMenuId(null);
                          onEditTimeline?.(timeline);
                        }}
                        onViewMap={() => {
                          setOpenMenuId(null);
                          onViewMap?.(timeline);
                        }}
                        onMembers={() => openMembers(timeline)}
                        onInvite={() => openInvite(timeline)}
                        onDuplicate={() => void duplicateTrip(timeline)}
                        onDelete={() => void deleteTrip(timeline)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setModal("create")}
                      className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/45 bg-card/70 p-6 text-center text-primary transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-accent/50"
                    >
                      <span className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_12px_28px_oklch(0.515_0.22_277_/_0.22)]">
                        <Plus className="size-6" />
                      </span>
                      <span className="mt-4 font-semibold">Tạo chuyến đi mới</span>
                      <span className="mt-2 max-w-44 text-sm text-muted-foreground">
                        Lên kế hoạch cho hành trình tiếp theo của bạn
                      </span>
                    </button>
                  </div>
                </section>
              </>
            )}
          </section>

          <aside className="space-y-4">
            <UpcomingTrips timelines={sortedTimelines} onViewAll={onOpenNotifications} onOpenTimeline={onEditTimeline} />
            <RecentActivities notifications={notifications} timelines={sortedTimelines} onViewAll={onOpenNotifications} />
            <CollaborationInvites notifications={notifications} timelines={sortedTimelines} onViewAll={onOpenNotifications} onOpenTimeline={onEditTimeline} />
            <SavedPlacesWidget places={savedPlaces} onExplore={onExplore} />
            <RecommendationsWidget places={recommendedPlaces} onExplore={onExplore} />
          </aside>
        </div>
      </main>

      {modal === "create" ? (
        <CreateTripWizard
          onClose={() => setModal(null)}
          onCreated={() => {
            setModal(null);
            loadDashboard();
          }}
        />
      ) : null}

      {modal === "join" ? (
        <JoinTripModal
          onClose={() => setModal(null)}
          onJoined={() => {
            setModal(null);
            loadDashboard();
          }}
        />
      ) : null}

      {modal === "edit" && selectedTimeline ? (
        <EditTripModal
          timeline={selectedTimeline}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            loadDashboard();
          }}
        />
      ) : null}

      {modal === "invite" && selectedTimeline ? (
        <InviteTripModal
          timeline={selectedTimeline}
          initialInvite={inviteResult}
          onClose={() => setModal(null)}
          onGenerated={(result) => {
            setInviteResult(result);
            loadDashboard();
          }}
        />
      ) : null}

      {modal === "members" && selectedTimeline ? (
        <MembersTripModal
          timeline={selectedTimeline}
          currentUserId={user?.id}
          onClose={() => setModal(null)}
          onChanged={() => {
            setModal(null);
            loadDashboard();
          }}
          onInvite={() => {
            setModal("invite");
            setInviteResult(null);
          }}
        />
      ) : null}
    </>
  );
}

function QuickAction({
  icon: Icon,
  title,
  subtitle,
  tone = "primary",
  onClick,
}: {
  icon: typeof Plus;
  title: string;
  subtitle: string;
  tone?: "primary" | "green" | "sky" | "amber";
  onClick?: () => void;
}) {
  const toneClass = {
    primary: "bg-accent text-primary",
    green: "bg-emerald-500/12 text-emerald-500",
    sky: "bg-sky-500/12 text-sky-500",
    amber: "bg-amber-500/12 text-amber-500",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", toneClass)}>
        <Icon className="size-6" />
      </span>
      <span>
        <span className="block font-semibold text-foreground">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function FeaturedTrip({
  timeline,
  onEditTimeline,
  onViewMap,
  onInvite,
}: {
  timeline: Timeline;
  onEditTimeline: () => void;
  onViewMap: () => void;
  onInvite: () => void;
}) {
  const status = timelineStatus(timeline);
  const progress = progressForTimeline(timeline);

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={tripCoverImage(timeline)}
          alt={timeline.title}
          className="h-64 w-full object-cover lg:h-72"
        />
        <span className="absolute left-4 top-4 rounded-full bg-foreground/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
          {progress}% hoàn thành
        </span>
      </div>
      <div className="flex min-w-0 flex-col justify-center">
        <span className={cn("w-fit rounded-full px-3 py-1 text-xs font-semibold", status.className)}>
          {status.label}
        </span>
        <h3 className="mt-4 text-2xl font-bold text-foreground">{timeline.title}</h3>
        <p className="mt-3 flex items-center gap-2 text-muted-foreground">
          <CalendarDays className="size-4" />
          {formatDateRange(timeline)}
        </p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <MapPin className="size-4" />
            {uniquePlaceCount(timeline)} địa điểm
          </span>
          <span className="flex items-center gap-2">
            <CalendarDays className="size-4" />
            {timeline.events.length} hoạt động
          </span>
          <span className="flex items-center gap-2">
            <Users className="size-4" />
            {timeline.members.length} thành viên
          </span>
        </div>
        <div className="mt-8 flex items-center gap-4">
          <div className="h-2 min-w-0 flex-1 rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onEditTimeline}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
          >
            Chỉnh sửa Timeline
          </button>
          <button
            type="button"
            onClick={onViewMap}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Xem bản đồ
          </button>
          <button
            type="button"
            onClick={onInvite}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
          >
            Mời thành viên
          </button>
        </div>
      </div>
    </div>
  );
}

function TripCard({
  timeline,
  listMode,
  menuOpen,
  onToggleMenu,
  onEdit,
  onEditTimeline,
  onViewMap,
  onMembers,
  onInvite,
  onDuplicate,
  onDelete,
}: {
  timeline: Timeline;
  listMode: boolean;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onEditTimeline: () => void;
  onViewMap: () => void;
  onMembers: () => void;
  onInvite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const status = timelineStatus(timeline);
  const progress = progressForTimeline(timeline);

  return (
    <article
      className={cn(
        "relative overflow-visible rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        listMode ? "grid grid-cols-[220px_minmax(0,1fr)]" : "",
      )}
    >
      <div className={cn("relative overflow-hidden", listMode ? "rounded-l-2xl" : "rounded-t-2xl")}>
        <img
          src={tripCoverImage(timeline)}
          alt={timeline.title}
          className={cn("w-full object-cover", listMode ? "h-full min-h-48" : "h-36")}
        />
        <span className={cn("absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold", status.className)}>
          {status.label}
        </span>
      </div>
      <TripMenuButton
        timeline={timeline}
        isOpen={menuOpen}
        onToggle={onToggleMenu}
        onEdit={onEdit}
        onEditTimeline={onEditTimeline}
        onViewMap={onViewMap}
        onMembers={onMembers}
        onInvite={onInvite}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        compact
      />
      <div className="p-4">
        <h3 className="font-bold text-foreground">{timeline.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{formatDateRange(timeline)}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {uniquePlaceCount(timeline)} địa điểm
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {timeline.events.length} hoạt động
          </span>
        </div>
        <MemberStack members={timeline.members} />
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", progress === 100 ? "bg-emerald-500" : "bg-primary")}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
        </div>
        <button
          type="button"
          onClick={onEditTimeline}
          className="mt-4 w-full rounded-xl border border-primary/40 px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent"
        >
          Chỉnh sửa Timeline
        </button>
      </div>
    </article>
  );
}

function TripMenuButton({
  timeline,
  isOpen,
  onToggle,
  onEdit,
  onEditTimeline,
  onViewMap,
  onMembers,
  onInvite,
  onDuplicate,
  onDelete,
  compact,
}: {
  timeline: Timeline;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onEditTimeline: () => void;
  onViewMap: () => void;
  onMembers: () => void;
  onInvite: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("relative", compact ? "absolute right-3 top-3" : "")}>
      <button
        type="button"
        aria-label="Tùy chọn chuyến đi"
        onClick={onToggle}
        className="flex size-9 items-center justify-center rounded-xl border border-border bg-card/95 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {isOpen ? (
        <div className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-border bg-card p-2 shadow-xl">
          <MenuItem icon={Edit3} label="Chỉnh sửa chuyến đi" onClick={onEdit} />
          <MenuItem icon={CalendarDays} label="Chỉnh sửa Timeline" onClick={onEditTimeline} />
          <MenuItem icon={Map} label="Xem bản đồ" onClick={onViewMap} />
          <div className="my-2 border-t border-border" />
          <MenuItem icon={Users} label="Thành viên" onClick={onMembers} />
          <MenuItem icon={Link2} label="Mã tham gia" badge={timeline.activeInviteCode || "Tạo mã"} onClick={onInvite} />
          <MenuItem icon={Share2} label="Chia sẻ chuyến đi" onClick={onInvite} />
          <div className="my-2 border-t border-border" />
          <MenuItem icon={Copy} label="Nhân bản chuyến đi" onClick={onDuplicate} />
          <MenuItem icon={Trash2} label="Xóa chuyến đi" danger onClick={onDelete} />
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  badge,
  danger,
  disabled,
  onClick,
}: {
  icon: typeof Plus;
  label: string;
  badge?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
        danger ? "text-destructive" : "text-foreground",
        disabled ? "cursor-not-allowed opacity-45" : "hover:bg-accent",
      )}
    >
      <Icon className="size-4" />
      <span className="min-w-0 flex-1">{label}</span>
      {badge ? (
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{badge}</span>
      ) : null}
    </button>
  );
}

function MemberStack({ members }: { members: Timeline["members"] }) {
  return (
    <div className="mt-4 flex items-center">
      {members.slice(0, 3).map((member, index) => (
        <span
          key={member.id}
          className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-primary text-xs font-semibold text-primary-foreground"
          style={{ marginLeft: index ? -8 : 0 }}
        >
          {memberInitial(member.displayName || member.username)}
        </span>
      ))}
      {members.length > 3 ? (
        <span className="ml-1 text-xs font-medium text-muted-foreground">+{members.length - 3}</span>
      ) : null}
    </div>
  );
}

function UtilityHeader({
  title,
  onViewAll,
}: {
  title: string;
  onViewAll?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-bold text-foreground">{title}</h2>
      {onViewAll ? (
        <button
          type="button"
          onClick={onViewAll}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Xem tất cả
        </button>
      ) : null}
    </div>
  );
}

function UpcomingTrips({
  timelines,
  onViewAll,
  onOpenTimeline,
}: {
  timelines: Timeline[];
  onViewAll?: () => void;
  onOpenTimeline?: (timeline: Timeline) => void;
}) {
  const upcoming = timelines
    .filter((timeline) => dateOnly(timeline.endDate).getTime() >= dateOnly(todayIso).getTime())
    .sort((first, second) => dateOnly(first.startDate).getTime() - dateOnly(second.startDate).getTime())
    .slice(0, 2);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <UtilityHeader title="Lịch sắp tới" onViewAll={onViewAll} />
      <div className="mt-4 space-y-3">
        {upcoming.map((timeline) => {
          const daysUntil = Math.ceil((dateOnly(timeline.startDate).getTime() - dateOnly(todayIso).getTime()) / 86400000);
          return (
            <button
              key={timeline.id}
              type="button"
              onClick={() => onOpenTimeline?.(timeline)}
              className="flex w-full items-center gap-3 rounded-xl text-left transition-colors hover:bg-accent"
            >
              <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-muted text-foreground">
                <span className="text-lg font-bold leading-none">{dateOnly(timeline.startDate).getDate()}</span>
                <span className="mt-1 text-[10px] font-semibold uppercase text-muted-foreground">
                  Th {dateOnly(timeline.startDate).getMonth() + 1}
                </span>
              </span>
              <span className="min-w-0 flex-1 py-2">
                <span className="block truncate text-sm font-semibold text-foreground">{timeline.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{formatDateRange(timeline)}</span>
                <span className="mt-1 block text-xs font-semibold text-primary">
                  {daysUntil > 0 ? `Còn ${daysUntil} ngày nữa` : "Đang diễn ra"}
                </span>
              </span>
            </button>
          );
        })}
        {!upcoming.length ? (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Chưa có lịch sắp tới.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function RecentActivities({
  notifications,
  timelines,
  onViewAll,
}: {
  notifications: NotificationItem[];
  timelines: Timeline[];
  onViewAll?: () => void;
}) {
  const fallback = timelines.slice(0, 4).map((timeline) => ({
    id: timeline.id,
    title: timeline.title,
    message: `Chuyến đi có ${timeline.events.length} hoạt động`,
    createdAt: `${timeline.startDate}T00:00:00`,
    type: "TIMELINE",
  }));
  const activities = notifications.length ? notifications : fallback;

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <UtilityHeader title="Hoạt động gần đây" onViewAll={onViewAll} />
      <div className="mt-4 space-y-4">
        {activities.map((item, index) => (
          <div key={item.id} className="flex gap-3">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl",
                index % 4 === 0 && "bg-orange-50 text-orange-600",
                index % 4 === 1 && "bg-emerald-50 text-emerald-600",
                index % 4 === 2 && "bg-accent text-primary",
                index % 4 === 3 && "bg-red-50 text-red-600",
              )}
            >
              {index % 4 === 0 ? <MapPin className="size-5" /> : null}
              {index % 4 === 1 ? <Users className="size-5" /> : null}
              {index % 4 === 2 ? <Sparkles className="size-5" /> : null}
              {index % 4 === 3 ? <CalendarDays className="size-5" /> : null}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">
                {"message" in item && item.message ? item.message : "Có cập nhật mới"}
              </p>
              <p className="mt-1 font-semibold text-foreground">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{relativeTime(item.createdAt)}</p>
            </div>
          </div>
        ))}
        {!activities.length ? (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Chưa có hoạt động nào.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function CollaborationInvites({
  notifications,
  timelines,
  onViewAll,
  onOpenTimeline,
}: {
  notifications: NotificationItem[];
  timelines: Timeline[];
  onViewAll?: () => void;
  onOpenTimeline?: (timeline: Timeline) => void;
}) {
  const inviteNotifications = notifications.filter(
    (notification) => notification.category === "COLLABORATION" || notification.type === "COLLABORATION_INVITE",
  );
  const fallbackTimelines = timelines.filter((timeline) => timeline.members.length > 1).slice(0, 2);

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <UtilityHeader title="Lời mời tham gia" onViewAll={onViewAll} />
      <div className="mt-4 space-y-3">
        {inviteNotifications.slice(0, 2).map((notification) => (
          <div key={notification.id} className="rounded-xl bg-muted p-3">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-700">
                {memberInitial(String(notification.payload?.actorUsername || notification.title))}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.message || "Bạn có lời mời cộng tác mới."}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onViewAll}
              className="mt-3 w-full rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Xem chi tiết
            </button>
          </div>
        ))}
        {!inviteNotifications.length
          ? fallbackTimelines.map((timeline) => (
              <button
                key={timeline.id}
                type="button"
                onClick={() => onOpenTimeline?.(timeline)}
                className="flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left transition-colors hover:bg-accent"
              >
                <MemberStack members={timeline.members} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">{timeline.title}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{timeline.members.length} thành viên đang cộng tác</span>
                </span>
              </button>
            ))
          : null}
        {!inviteNotifications.length && !fallbackTimelines.length ? (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Chưa có lời mời hoặc timeline cộng tác.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function SavedPlacesWidget({
  places,
  onExplore,
}: {
  places: Place[];
  onExplore?: () => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <UtilityHeader title="Địa điểm đã lưu" onViewAll={onExplore} />
      <div className="mt-4 space-y-3">
        {places.slice(0, 3).map((place) => (
          <button
            key={`${place.category}-${place.id}`}
            type="button"
            onClick={onExplore}
            className="flex w-full items-center gap-3 rounded-xl text-left transition-colors hover:bg-accent"
          >
            <img src={placeImage(place)} alt={place.name} className="size-11 shrink-0 rounded-xl object-cover" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-foreground">{place.name}</span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">{place.district || place.address || "Việt Nam"}</span>
            </span>
          </button>
        ))}
        {!places.length ? (
          <button
            type="button"
            onClick={onExplore}
            className="flex w-full items-center gap-3 rounded-xl bg-muted p-4 text-left text-sm text-muted-foreground transition-colors hover:bg-accent"
          >
            <Bookmark className="size-5 text-primary" />
            Lưu địa điểm từ trang khám phá để xem nhanh ở đây.
          </button>
        ) : null}
      </div>
    </section>
  );
}

function RecommendationsWidget({
  places,
  onExplore,
}: {
  places: Place[];
  onExplore?: () => void;
}) {
  const place = places[0];

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="size-5 text-amber-500" />
        <h2 className="font-bold text-foreground">Gợi ý cho bạn</h2>
      </div>
      {place ? (
        <button
          type="button"
          onClick={onExplore}
          className="mt-4 flex w-full items-center gap-3 rounded-xl bg-muted p-3 text-left transition-colors hover:bg-accent"
        >
          <img src={placeImage(place)} alt={place.name} className="size-14 shrink-0 rounded-xl object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted-foreground">Bạn có thể thích</span>
            <span className="mt-1 block truncate text-sm font-semibold text-foreground">{place.name}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              Xem gợi ý
              <RefreshCw className="size-3.5" />
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onExplore}
          className="mt-4 rounded-xl bg-accent p-4 text-left text-sm text-primary"
        >
          Khám phá thêm địa điểm để VietJourney gợi ý chính xác hơn.
        </button>
      )}
    </section>
  );
}

function EmptyTripState({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="mt-6 rounded-2xl border border-dashed border-primary/40 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
        <Map className="size-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-foreground">Bạn chưa có chuyến đi nào</h2>
      <p className="mx-auto mt-2 max-w-md text-muted-foreground">
        Tạo timeline đầu tiên để lưu địa điểm, mời bạn bè và lên lịch cho hành trình.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
      >
        Tạo chuyến đi mới
      </button>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

function ModalFrame({
  title,
  subtitle,
  children,
  onClose,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className={cn("max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-card p-5 shadow-2xl", className || "max-w-lg")}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stepper({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="mt-5 flex items-center">
      {labels.map((label, index) => {
        const value = index + 1;
        const active = value <= step;
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {value}
            </span>
            <span className={cn("ml-2 hidden text-xs font-medium sm:inline", active ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
            {index < labels.length - 1 ? <span className="mx-3 h-px flex-1 bg-border" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function CreateTripWizard({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1);
  const [input, setInput] = useState<TimelineInput>({
    title: "",
    description: "",
    startDate: todayIso,
    endDate: defaultEndIso,
    visibility: "SHARED",
  });
  const [method, setMethod] = useState<StartMethod>("ai");
  const [interests, setInterests] = useState<string[]>(["Ẩm thực"]);
  const [budget, setBudget] = useState("Trung bình");
  const [pace, setPace] = useState("Cân bằng");
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTimeline, setCreatedTimeline] = useState<Timeline | null>(null);
  const [createdInvite, setCreatedInvite] = useState<InviteCodeResult | null>(null);

  useEffect(() => {
    if (step !== 3 || method === "blank") return;
    const controller = new AbortController();
    fetchPlaces(
      {
        category: interests.includes("Ẩm thực") ? categoryFilter("FOOD") : undefined,
        size: 12,
      },
      controller.signal,
    )
      .then((page) => {
        setPlaces(page.data);
        if (method === "ai") {
          setSelectedPlaces(page.data.slice(0, Math.min(dayCount(input.startDate, input.endDate) * 2, 6)));
        }
      })
      .catch(() => setPlaces([]));
    return () => controller.abort();
  }, [step, method, interests, input.startDate, input.endDate]);

  function toggleInterest(value: string) {
    setInterests((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function togglePlace(place: Place) {
    setSelectedPlaces((current) =>
      current.some((item) => item.id === place.id)
        ? current.filter((item) => item.id !== place.id)
        : [...current, place],
    );
  }

  function validateStepOne() {
    if (!input.title.trim()) {
      setError("Vui lòng nhập tên chuyến đi.");
      return false;
    }
    if (dateOnly(input.startDate) > dateOnly(input.endDate)) {
      setError("Ngày kết thúc phải sau ngày bắt đầu.");
      return false;
    }
    setError(null);
    return true;
  }

  async function submit() {
    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const descriptionParts = [
        input.description?.trim(),
        method === "ai" ? `AI Planner: ${interests.join(", ")} · ${budget} · ${pace}` : "",
        method === "explore" ? `Đã chọn ${selectedPlaces.length} địa điểm từ khám phá.` : "",
      ].filter(Boolean);
      const timeline = await createTimeline({
        ...input,
        title: input.title.trim(),
        description: descriptionParts.join("\n"),
      });

      await Promise.allSettled(
        selectedPlaces.slice(0, dayCount(input.startDate, input.endDate) * 3).map((place, index) => {
          const window = makeEventWindow(input.startDate, index);
          return createTimelineEvent(timeline.id, {
            externalPlaceId: place.id,
            category: placeCategory(place),
            startTime: window.startTime,
            endTime: window.endTime,
            orderIndex: index % 3,
            notes: method === "ai" ? "Được đề xuất từ AI Planner" : "Được chọn trong bước khám phá",
            status: "PLANNED",
          });
        }),
      );

      const invite =
        input.visibility === "SHARED"
          ? await resetTimelineInviteCode(timeline.id, {
              role: "EDITOR",
              maxUses: 20,
              expiresInHours: 72,
            }).catch(() => null)
          : null;

      setCreatedTimeline(timeline);
      setCreatedInvite(invite);
      setStep(5);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không tạo được chuyến đi.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 5 && createdTimeline) {
    return (
      <ModalFrame title="" onClose={onCreated} className="max-w-md">
        <div className="py-4 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <Check className="size-10" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-foreground">Tạo chuyến đi thành công</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chuyến đi "{createdTimeline.title}" đã sẵn sàng. Bạn có thể bắt đầu thêm lịch trình ngay bây giờ.
          </p>
          {createdInvite?.code ? (
            <div className="mt-6 rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Mã tham gia chuyến đi</p>
              <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-bold tracking-wide">
                {createdInvite.code}
                <button
                  type="button"
                  onClick={() => navigator.clipboard?.writeText(createdInvite.code)}
                  className="text-primary"
                >
                  <Copy className="size-5" />
                </button>
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={onCreated}
            className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
          >
            Bắt đầu lập lịch trình
          </button>
        </div>
      </ModalFrame>
    );
  }

  return (
    <ModalFrame
      title={method === "ai" && step >= 3 ? "AI Planner" : "Tạo chuyến đi mới"}
      subtitle="Các bước tạo chuyến đi mới trên VietJourney"
      onClose={onClose}
      className={cn(step === 3 && method === "explore" ? "max-w-2xl" : "max-w-lg")}
    >
      <Stepper step={Math.min(step, 4)} labels={["Thông tin", "Cách bắt đầu", method === "blank" ? "Tạo trống" : method === "ai" ? "AI gợi ý" : "Khám phá", "Thiết lập"]} />

      {error ? (
        <div className="mt-4 rounded-xl border border-destructive/30 bg-red-50 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-6 space-y-4">
          <TextField label="Tên chuyến đi" value={input.title} onChange={(title) => setInput({ ...input, title })} placeholder="Ví dụ: Đà Nẵng 3N2Đ" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Ngày bắt đầu" type="date" value={input.startDate} onChange={(startDate) => setInput({ ...input, startDate })} />
            <TextField label="Ngày kết thúc" type="date" value={input.endDate} onChange={(endDate) => setInput({ ...input, endDate })} />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Loại chuyến đi</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <ChoiceCard active={input.visibility === "PRIVATE"} icon={Lock} title="Cá nhân" subtitle="Chỉ mình bạn" onClick={() => setInput({ ...input, visibility: "PRIVATE" })} />
              <ChoiceCard active={input.visibility === "SHARED"} icon={Users} title="Nhóm" subtitle="Đi cùng bạn bè, gia đình..." onClick={() => setInput({ ...input, visibility: "SHARED" })} />
            </div>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">Bạn muốn bắt đầu như thế nào?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn cách phù hợp để VietJourney hỗ trợ bạn lập kế hoạch.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MethodCard active={method === "ai"} icon={Bot} title="AI Planner" subtitle="Đề AI gợi ý lịch trình phù hợp với sở thích và thời gian của bạn" onClick={() => setMethod("ai")} />
            <MethodCard active={method === "explore"} icon={Compass} title="Khám phá & Tự chọn" subtitle="Tự khám phá địa điểm và thêm vào lịch trình của bạn" onClick={() => setMethod("explore")} />
            <MethodCard active={method === "blank"} icon={FileText} title="Tạo trống" subtitle="Bắt đầu với timeline trống và tự thêm mọi thứ" onClick={() => setMethod("blank")} />
          </div>
        </div>
      ) : null}

      {step === 3 && method === "ai" ? (
        <div className="mt-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold text-foreground">Kể cho AI biết sở thích của bạn</h3>
            <p className="mt-1 text-sm text-muted-foreground">AI sẽ gợi ý lịch trình phù hợp nhất.</p>
          </div>
          <ChipGroup label="Bạn thích điều gì?" values={["Ẩm thực", "Check-in", "Cafe", "Bãi biển", "Mua sắm", "Văn hóa - Lịch sử", "Thiên nhiên"]} selected={interests} onToggle={toggleInterest} />
          <Segmented label="Ngân sách dự kiến" values={["Tiết kiệm", "Trung bình", "Cao cấp"]} value={budget} onChange={setBudget} />
          <Segmented label="Nhịp độ chuyến đi" values={["Thư giãn", "Cân bằng", "Khám phá"]} value={pace} onChange={setPace} />
          <AiPreview places={selectedPlaces} startDate={input.startDate} />
        </div>
      ) : null}

      {step === 3 && method === "explore" ? (
        <div className="mt-6">
          <h3 className="text-lg font-bold text-foreground">Khám phá địa điểm</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn vài địa điểm yêu thích để tạo hoạt động đầu tiên.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border px-3 py-2.5">
            <Search className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Gợi ý từ database địa điểm hiện tại</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {places.slice(0, 9).map((place) => {
              const active = selectedPlaces.some((item) => item.id === place.id);
              return (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => togglePlace(place)}
                  className={cn(
                    "overflow-hidden rounded-xl border bg-card text-left transition-all",
                    active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
                  )}
                >
                  <img src={placeImage(place)} alt={place.name} className="h-24 w-full object-cover" />
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-foreground">{place.name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{place.district || place.address || "Việt Nam"}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {step === 3 && method === "blank" ? (
        <div className="mt-8 py-8 text-center">
          <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-accent text-primary">
            <CalendarDays className="size-10" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-foreground">Bắt đầu với timeline trống</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Bạn có thể thêm địa điểm, hoạt động và sắp xếp lịch trình theo ý muốn.
          </p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="mt-6 space-y-4">
          <TextArea label="Mô tả chuyến đi" value={input.description || ""} onChange={(description) => setInput({ ...input, description })} placeholder="Viết vài dòng về chuyến đi này..." />
          <div className="rounded-2xl border border-border bg-background p-4">
            <p className="font-semibold text-foreground">Tổng quan</p>
            <div className="mt-3 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <span>{dayCount(input.startDate, input.endDate)} ngày</span>
              <span>{selectedPlaces.length} địa điểm đã chọn</span>
              <span>{input.visibility === "SHARED" ? "Chuyến đi nhóm" : "Chuyến đi cá nhân"}</span>
              <span>{budget}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
          className="rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground"
        >
          {step === 1 ? "Hủy" : "Quay lại"}
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => {
            if (step === 1 && !validateStepOne()) return;
            if (step < 4) setStep(step + 1);
            else submit();
          }}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {step === 4 ? "Tạo chuyến đi" : method === "ai" && step === 3 ? "Tạo lịch trình" : "Tiếp tục"}
        </button>
      </div>
    </ModalFrame>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={300}
        className="mt-2 min-h-28 w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
      />
    </label>
  );
}

function ChoiceCard({
  active,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: typeof Plus;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        active ? "border-primary bg-accent text-primary" : "border-border hover:border-primary/40",
      )}
    >
      <Icon className="size-5" />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

function MethodCard({
  active,
  icon: Icon,
  title,
  subtitle,
  onClick,
}: {
  active: boolean;
  icon: typeof Plus;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative min-h-44 rounded-2xl border p-4 text-center transition-all",
        active ? "border-primary bg-accent/45 text-primary" : "border-border hover:border-primary/40",
      )}
    >
      {active ? (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-3" />
        </span>
      ) : null}
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-background text-primary">
        <Icon className="size-7" />
      </span>
      <span className="mt-4 block font-semibold text-foreground">{title}</span>
      <span className="mt-2 block text-xs leading-relaxed text-muted-foreground">{subtitle}</span>
    </button>
  );
}

function ChipGroup({
  label,
  values,
  selected,
  onToggle,
}: {
  label: string;
  values: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            className={cn(
              "rounded-xl border px-4 py-2 text-sm transition-colors",
              selected.includes(value)
                ? "border-primary bg-accent text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function Segmented({
  label,
  values,
  value,
  onChange,
}: {
  label: string;
  values: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-foreground">{label}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {values.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            className={cn(
              "rounded-xl border px-3 py-3 text-sm transition-colors",
              item === value
                ? "border-primary bg-accent text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiPreview({ places, startDate }: { places: Place[]; startDate: string }) {
  if (!places.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex items-center gap-3">
        <Sparkles className="size-6 text-primary" />
        <div>
          <p className="font-semibold text-foreground">AI đã tạo lịch trình nháp</p>
          <p className="text-sm text-muted-foreground">Bạn có thể chỉnh sửa sau khi tạo chuyến đi.</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {places.slice(0, 3).map((place, index) => (
          <div key={place.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-2">
            <img src={placeImage(place)} alt={place.name} className="size-12 rounded-lg object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">Ngày {index + 1} · {formatDate(toDateInput(addDays(dateOnly(startDate), index)))}</p>
              <p className="truncate text-xs text-muted-foreground">{place.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function JoinTripModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await joinTimelineByCode(code);
      onJoined();
    } catch (joinError) {
      setError(joinError instanceof Error ? joinError.message : "Không tham gia được chuyến đi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Tham gia bằng mã" subtitle="Nhập mã được chủ chuyến đi chia sẻ" onClose={onClose}>
      <div className="mt-6 space-y-4">
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div> : null}
        <TextField label="Mã tham gia" value={code} onChange={(value) => setCode(value.toUpperCase())} placeholder="ABCD1234" />
        <button
          type="button"
          disabled={!code.trim() || submitting}
          onClick={submit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Tham gia chuyến đi
        </button>
      </div>
    </ModalFrame>
  );
}

function EditTripModal({
  timeline,
  onClose,
  onSaved,
}: {
  timeline: Timeline;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [input, setInput] = useState<TimelineInput>(timelineInputFromTimeline(timeline));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await updateTimeline(timeline.id, input);
      onSaved();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được chuyến đi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Chỉnh sửa chuyến đi" onClose={onClose}>
      <div className="mt-6 space-y-4">
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div> : null}
        <TextField label="Tên chuyến đi" value={input.title} onChange={(title) => setInput({ ...input, title })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Ngày bắt đầu" type="date" value={input.startDate} onChange={(startDate) => setInput({ ...input, startDate })} />
          <TextField label="Ngày kết thúc" type="date" value={input.endDate} onChange={(endDate) => setInput({ ...input, endDate })} />
        </div>
        <TextArea label="Mô tả" value={input.description || ""} onChange={(description) => setInput({ ...input, description })} />
        <Segmented
          label="Quyền xem"
          values={["PRIVATE", "SHARED", "PUBLIC_READ"]}
          value={input.visibility}
          onChange={(visibility) => setInput({ ...input, visibility: visibility as TimelineVisibility })}
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-5 py-3 text-sm font-semibold">
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={submit}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Lưu thay đổi
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function MembersTripModal({
  timeline,
  currentUserId,
  onClose,
  onChanged,
  onInvite,
}: {
  timeline: Timeline;
  currentUserId?: string;
  onClose: () => void;
  onChanged: () => void;
  onInvite: () => void;
}) {
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<Exclude<TimelineMemberRole, "OWNER">>("EDITOR");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = timeline.ownerId === currentUserId;

  async function addMember() {
    setSubmitting(true);
    setError(null);
    try {
      await upsertTimelineMember(timeline.id, { username: username.trim(), role });
      onChanged();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Không thêm được thành viên.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeMember(memberId: string) {
    setRemovingId(memberId);
    setError(null);
    try {
      await removeTimelineMember(timeline.id, memberId);
      onChanged();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Không xóa được thành viên.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <ModalFrame title="Thành viên" subtitle={timeline.title} onClose={onClose} className="max-w-2xl">
      <div className="mt-6 space-y-5">
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div> : null}

        <div className="space-y-3">
          {timeline.members.map((member) => {
            const isOwner = member.role === "OWNER";
            return (
              <div key={member.id} className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {memberInitial(member.displayName || member.username)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{member.displayName || member.username}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">@{member.username}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {member.role === "OWNER" ? "Chủ chuyến đi" : member.role === "EDITOR" ? "Biên tập" : "Chỉ xem"}
                </span>
                {canManage && !isOwner ? (
                  <button
                    type="button"
                    disabled={removingId === member.id}
                    onClick={() => void removeMember(member.id)}
                    className="flex size-9 items-center justify-center rounded-xl text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    aria-label={`Xóa ${member.username}`}
                  >
                    {removingId === member.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>

        {canManage ? (
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="font-semibold text-foreground">Thêm thành viên</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px]">
              <TextField label="Username" value={username} onChange={setUsername} placeholder="nguyenvana" />
              <Segmented
                label="Vai trò"
                values={["EDITOR", "VIEWER"]}
                value={role}
                onChange={(value) => setRole(value as Exclude<TimelineMemberRole, "OWNER">)}
              />
            </div>
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <button
                type="button"
                onClick={onInvite}
                className="flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                <Link2 className="size-4" />
                Dùng mã tham gia
              </button>
              <button
                type="button"
                disabled={!username.trim() || submitting}
                onClick={() => void addMember()}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Users className="size-4" />}
                Thêm thành viên
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Chỉ chủ chuyến đi có thể thêm hoặc xóa thành viên.
          </p>
        )}
      </div>
    </ModalFrame>
  );
}

function InviteTripModal({
  timeline,
  initialInvite,
  onClose,
  onGenerated,
}: {
  timeline: Timeline;
  initialInvite: InviteCodeResult | null;
  onClose: () => void;
  onGenerated: (result: InviteCodeResult) => void;
}) {
  const [invite, setInvite] = useState<InviteCodeResult | null>(initialInvite);
  const [role, setRole] = useState<Exclude<TimelineMemberRole, "OWNER">>("VIEWER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await resetTimelineInviteCode(timeline.id, {
        role,
        maxUses: 20,
        expiresInHours: 72,
      });
      setInvite(result);
      onGenerated(result);
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : "Không tạo được mã tham gia.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Mã tham gia" subtitle={timeline.title} onClose={onClose} className="max-w-md">
      <div className="mt-6 space-y-4">
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-destructive">{error}</div> : null}
        <div className="rounded-2xl border border-border bg-card p-4">
          <Segmented
            label="Quyền khi tham gia"
            values={["VIEWER", "EDITOR"]}
            value={role}
            onChange={(value) => setRole(value as Exclude<TimelineMemberRole, "OWNER">)}
          />
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Viewer có thể xem và gửi yêu cầu thêm địa điểm. Editor có thể chỉnh sửa lịch trình trực tiếp.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-background p-5 text-center">
          <p className="text-sm text-muted-foreground">Mã tham gia hiện tại</p>
          <p className="mt-2 text-3xl font-bold tracking-wide text-foreground">
            {invite?.code || timeline.activeInviteCode || "Chưa có"}
          </p>
          {(invite?.code || timeline.activeInviteCode) ? (
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(invite?.code || timeline.activeInviteCode || "")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-primary"
            >
              <Clipboard className="size-4" />
              Sao chép
            </button>
          ) : null}
        </div>
        <button
          type="button"
          disabled={submitting}
          onClick={generate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          Tạo mã mới
        </button>
      </div>
    </ModalFrame>
  );
}
