import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Inbox,
  Loader2,
  Map,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import {
  archiveNotification,
  fetchNotifications,
  fetchNotificationUnreadCount,
  fetchTimeline,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationCategory,
  type NotificationItem,
  type Timeline,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";

type NotificationFilter = "ALL" | NotificationCategory;
type ReadFilter = "ALL" | "UNREAD" | "ARCHIVED";

interface NotificationPageProps {
  onOpenTimeline: (timeline: Timeline) => void;
  onOpenTrips: () => void;
}

const categoryFilters: Array<{ value: NotificationFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "TIMELINE", label: "Timeline" },
  { value: "COLLABORATION", label: "Cộng tác" },
  { value: "RECOMMENDATION", label: "Gợi ý" },
  { value: "SYSTEM", label: "Hệ thống" },
];

const readFilters: Array<{ value: ReadFilter; label: string }> = [
  { value: "ALL", label: "Mới nhất" },
  { value: "UNREAD", label: "Chưa đọc" },
  { value: "ARCHIVED", label: "Đã lưu trữ" },
];

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

function categoryLabel(category: NotificationCategory) {
  switch (category) {
    case "TIMELINE":
      return "Timeline";
    case "COLLABORATION":
      return "Cộng tác";
    case "RECOMMENDATION":
      return "Gợi ý";
    case "SYSTEM":
    default:
      return "Hệ thống";
  }
}

function notificationIcon(category: NotificationCategory) {
  switch (category) {
    case "TIMELINE":
      return CalendarDays;
    case "COLLABORATION":
      return Users;
    case "RECOMMENDATION":
      return Sparkles;
    case "SYSTEM":
    default:
      return Bell;
  }
}

function notificationTone(category: NotificationCategory) {
  switch (category) {
    case "TIMELINE":
      return "bg-sky-500/12 text-sky-600";
    case "COLLABORATION":
      return "bg-emerald-500/12 text-emerald-600";
    case "RECOMMENDATION":
      return "bg-amber-500/12 text-amber-600";
    case "SYSTEM":
    default:
      return "bg-primary/12 text-primary";
  }
}

function timelineTitle(notification: NotificationItem) {
  const payloadTitle = notification.payload?.timelineTitle;
  return typeof payloadTitle === "string" ? payloadTitle : null;
}

export function NotificationPage({ onOpenTimeline, onOpenTrips }: NotificationPageProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [category, setCategory] = useState<NotificationFilter>("ALL");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const status = readFilter === "UNREAD" ? "UNREAD" : undefined;
      const [page, count] = await Promise.all([
        fetchNotifications(
          {
            page: 0,
            size: 40,
            status,
            category: category === "ALL" ? undefined : category,
            includeArchived: readFilter === "ARCHIVED",
          },
          signal,
        ),
        fetchNotificationUnreadCount(signal).catch(() => ({ unreadCount: 0 })),
      ]);

      const nextNotifications =
        readFilter === "ARCHIVED"
          ? page.content.filter((item) => item.status === "ARCHIVED" || item.archivedAt)
          : page.content.filter((item) => item.status !== "ARCHIVED" && !item.archivedAt);

      setNotifications(nextNotifications);
      setUnreadCount(count.unreadCount);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Không tải được thông báo.");
      setNotifications([]);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [category, readFilter]);

  const groupedNotifications = useMemo(() => {
    const unread = notifications.filter((item) => item.status === "UNREAD");
    const read = notifications.filter((item) => item.status !== "UNREAD");
    return { unread, read };
  }, [notifications]);

  async function openRelatedTimeline(notification: NotificationItem) {
    const timelineId =
      notification.sourceReferenceType === "timeline"
        ? notification.sourceReferenceId
        : typeof notification.payload?.timelineId === "string"
          ? notification.payload.timelineId
          : null;

    if (!timelineId) {
      onOpenTrips();
      return;
    }

    setActionId(notification.id);
    setError(null);
    try {
      if (notification.status === "UNREAD") {
        await markNotificationAsRead(notification.id);
      }
      const timeline = await fetchTimeline(timelineId);
      onOpenTimeline(timeline);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "Không mở được chuyến đi liên quan.");
    } finally {
      setActionId(null);
      void load();
    }
  }

  async function markAllRead() {
    setActionId("read-all");
    setError(null);
    try {
      await markAllNotificationsAsRead();
      await load();
    } catch (markError) {
      setError(markError instanceof Error ? markError.message : "Không đánh dấu đã đọc được.");
    } finally {
      setActionId(null);
    }
  }

  async function archive(item: NotificationItem) {
    setActionId(item.id);
    setError(null);
    try {
      await archiveNotification(item.id);
      await load();
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Không lưu trữ được thông báo.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background px-5 pb-8 pt-10 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Thông báo</h1>
            <p className="mt-2 text-muted-foreground">
              Theo dõi lịch sắp tới, hoạt động timeline, lời mời cộng tác và gợi ý mới.
            </p>
          </div>
          <button
            type="button"
            disabled={!unreadCount || actionId === "read-all"}
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-55"
          >
            {actionId === "read-all" ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Đánh dấu đã đọc
          </button>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <SummaryCard icon={Inbox} label="Tổng thông báo" value={notifications.length} />
          <SummaryCard icon={Bell} label="Chưa đọc" value={unreadCount} tone="primary" />
          <SummaryCard icon={MessageCircle} label="Có liên kết chuyến đi" value={notifications.filter((item) => item.sourceReferenceId).length} tone="green" />
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {categoryFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setCategory(item.value)}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                  category === item.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {readFilters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setReadFilter(item.value)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  readFilter === item.value ? "border-primary bg-accent text-primary" : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {error ? (
          <div className="mt-5 rounded-2xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : notifications.length ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <NotificationList
              title="Chưa đọc"
              items={groupedNotifications.unread}
              actionId={actionId}
              onOpenRelatedTimeline={openRelatedTimeline}
              onArchive={archive}
            />
            <aside className="space-y-4">
              <NotificationList
                title="Đã xử lý"
                items={groupedNotifications.read.slice(0, 8)}
                compact
                actionId={actionId}
                onOpenRelatedTimeline={openRelatedTimeline}
                onArchive={archive}
              />
            </aside>
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-accent text-primary">
              <Bell className="size-7" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-foreground">Chưa có thông báo phù hợp</h2>
            <p className="mx-auto mt-2 max-w-md text-muted-foreground">
              Khi timeline có thay đổi, lời mời cộng tác hoặc gợi ý mới, chúng sẽ xuất hiện tại đây.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Bell;
  label: string;
  value: number;
  tone?: "default" | "primary" | "green";
}) {
  const toneClass = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-primary/12 text-primary",
    green: "bg-emerald-500/12 text-emerald-600",
  }[tone];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={cn("flex size-11 items-center justify-center rounded-xl", toneClass)}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function NotificationList({
  title,
  items,
  compact = false,
  actionId,
  onOpenRelatedTimeline,
  onArchive,
}: {
  title: string;
  items: NotificationItem[];
  compact?: boolean;
  actionId: string | null;
  onOpenRelatedTimeline: (notification: NotificationItem) => void;
  onArchive: (notification: NotificationItem) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-foreground">{title}</h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {items.length}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <NotificationRow
            key={item.id}
            item={item}
            compact={compact}
            busy={actionId === item.id}
            onOpenRelatedTimeline={() => onOpenRelatedTimeline(item)}
            onArchive={() => onArchive(item)}
          />
        ))}
        {!items.length ? (
          <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
            Không có thông báo trong nhóm này.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function NotificationRow({
  item,
  compact,
  busy,
  onOpenRelatedTimeline,
  onArchive,
}: {
  item: NotificationItem;
  compact: boolean;
  busy: boolean;
  onOpenRelatedTimeline: () => void;
  onArchive: () => void;
}) {
  const Icon = notificationIcon(item.category);
  const relatedTimelineTitle = timelineTitle(item);
  const hasTimelineTarget = item.sourceReferenceType === "timeline" || Boolean(item.payload?.timelineId);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-background p-4",
        item.status === "UNREAD" ? "ring-1 ring-primary/18" : "",
      )}
    >
      <div className="flex gap-3">
        <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", notificationTone(item.category))}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              {categoryLabel(item.category)}
            </span>
            {item.status === "UNREAD" ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                Mới
              </span>
            ) : null}
            <span className="text-xs text-muted-foreground">{relativeTime(item.createdAt)}</span>
          </div>
          <h3 className={cn("mt-2 font-bold text-foreground", compact ? "text-sm" : "text-base")}>
            {item.title}
          </h3>
          {item.message ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.message}</p>
          ) : null}
          {relatedTimelineTitle ? (
            <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Map className="size-4" />
              {relatedTimelineTitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        {hasTimelineTarget ? (
          <button
            type="button"
            disabled={busy}
            onClick={onOpenRelatedTimeline}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Mở chuyến đi
            <ChevronRight className="size-4" />
          </button>
        ) : null}
        {item.status !== "ARCHIVED" ? (
          <button
            type="button"
            disabled={busy}
            onClick={onArchive}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-60"
          >
            <Archive className="size-4" />
            Lưu trữ
          </button>
        ) : null}
      </div>
    </article>
  );
}
