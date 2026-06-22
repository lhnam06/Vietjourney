import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Inbox, Loader2, X } from "lucide-react";
import {
  decideTimelineProposal,
  fetchTimelineProposalReview,
  updateTimelineProposalSchedule,
  type TimelineMemberRole,
  type TimelineProposal,
  type TimelineProposalReviewPage,
  type TimelineProposalReviewState,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";
import { ProposalReviewCard } from "./ProposalReviewCard";

interface ProposalDrawerProps {
  open: boolean;
  timelineId: string;
  timelineStart: string;
  timelineEnd: string;
  currentRole: TimelineMemberRole | null;
  refreshVersion: number;
  onClose: () => void;
  onChanged: (message: string, eventsChanged: boolean) => Promise<void> | void;
}

type DrawerFilter = "ALL" | TimelineProposalReviewState;

const stateOptions: Array<{
  id: TimelineProposalReviewState;
  label: string;
  icon: typeof Clock3;
  countKey: "ready" | "conflict" | "unscheduled" | "processed";
}> = [
  { id: "READY", label: "Chờ duyệt", icon: Clock3, countKey: "ready" },
  { id: "CONFLICT", label: "Có xung đột", icon: AlertTriangle, countKey: "conflict" },
  { id: "UNSCHEDULED", label: "Chưa chọn giờ", icon: CalendarDays, countKey: "unscheduled" },
  { id: "PROCESSED", label: "Đã xử lý", icon: CheckCircle2, countKey: "processed" },
];

const weekdayFormatter = new Intl.DateTimeFormat("vi-VN", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

export function ProposalDrawer({
  open,
  timelineId,
  timelineStart,
  timelineEnd,
  currentRole,
  refreshVersion,
  onClose,
  onChanged,
}: ProposalDrawerProps) {
  const [filter, setFilter] = useState<DrawerFilter>("ALL");
  const [dateFilter, setDateFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<TimelineProposalReviewPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetchTimelineProposalReview(
      timelineId,
      {
        state: filter === "ALL" ? undefined : filter,
        date: dateFilter || undefined,
        page,
        size: 12,
      },
      controller.signal,
    )
      .then(setData)
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "Không tải được đề xuất.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [dateFilter, filter, localRefresh, open, page, refreshVersion, timelineId]);

  if (!open) return null;

  const summary = data?.summary;
  const pendingCount = (summary?.ready || 0) + (summary?.conflict || 0) + (summary?.unscheduled || 0);
  const allCount = pendingCount + (summary?.processed || 0);
  const proposalGroups = groupProposals(data?.content || []);

  async function saveSchedule(proposal: TimelineProposal, startTime: string, endTime: string) {
    setBusyId(proposal.id);
    setError(null);
    try {
      await updateTimelineProposalSchedule(timelineId, proposal.id, { startTime, endTime });
      await onChanged("Đã lưu thời gian đề xuất. Hãy kiểm tra lại trước khi chấp nhận.", false);
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Không lưu được thời gian đề xuất.");
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function decide(proposal: TimelineProposal, status: "ACCEPTED" | "REJECTED") {
    setBusyId(proposal.id);
    setError(null);
    try {
      await decideTimelineProposal(timelineId, proposal.id, status);
      await onChanged(
        status === "ACCEPTED" ? "Đã chấp nhận đề xuất và cập nhật lịch trình." : "Đã từ chối đề xuất.",
        status === "ACCEPTED",
      );
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Không xử lý được đề xuất.");
      setLocalRefresh((current) => current + 1);
    } finally {
      setBusyId(null);
    }
  }

  function chooseFilter(next: DrawerFilter) {
    setFilter(next);
    setPage(0);
  }

  function chooseDate(next: string | null) {
    setDateFilter(next);
    setPage(0);
  }

  return (
    <div className="fixed inset-0 z-[250]">
      <button
        type="button"
        aria-label="Đóng đề xuất của thành viên"
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-drawer-title"
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-border bg-card shadow-2xl sm:w-[460px]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Inbox className="size-5" />
              <span className="text-xs font-bold uppercase tracking-[0.16em]">Lịch trình chung</span>
            </div>
            <h2 id="proposal-drawer-title" className="mt-2 text-xl font-bold text-foreground">
              Đề xuất của thành viên
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Hôm nay có <strong className="text-foreground">{summary?.newToday || 0}</strong> đề xuất mới
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </header>

        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Theo thời gian</h3>
            {dateFilter ? (
              <button type="button" onClick={() => chooseDate(null)} className="text-xs font-semibold text-primary">
                Bỏ lọc
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {summary?.byDate.length ? summary.byDate.map((item) => (
              <button
                key={item.date}
                type="button"
                onClick={() => chooseDate(dateFilter === item.date ? null : item.date)}
                className={cn(
                  "shrink-0 rounded-lg border px-3 py-2 text-left transition",
                  dateFilter === item.date
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background hover:border-primary/35",
                )}
              >
                <span className="block text-xs font-bold">{formatWeekday(item.date)}</span>
                <span className={cn("mt-0.5 block text-[11px]", dateFilter === item.date ? "text-primary-foreground/75" : "text-muted-foreground")}>
                  {item.count} đề xuất
                </span>
              </button>
            )) : (
              <p className="text-xs text-muted-foreground">Chưa có đề xuất đã chọn thời gian.</p>
            )}
          </div>
        </div>

        <div className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Theo trạng thái</h3>
            <button
              type="button"
              onClick={() => chooseFilter("ALL")}
              className={cn("text-xs font-semibold", filter === "ALL" ? "text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Tất cả {allCount ? `(${allCount})` : ""}
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {stateOptions.map((option) => {
              const Icon = option.icon;
              const count = summary?.[option.countKey] || 0;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseFilter(filter === option.id ? "ALL" : option.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition",
                    filter === option.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:border-primary/30",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  <span className="tabular-nums text-muted-foreground">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading && !data ? (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải đề xuất
            </div>
          ) : proposalGroups.length ? (
            proposalGroups.map((group) => (
              <section key={group.key}>
                <div className="sticky top-0 z-10 border-y border-border bg-muted/90 px-5 py-2 text-xs font-bold text-muted-foreground backdrop-blur">
                  {group.label} · {group.items.length} đề xuất
                </div>
                {group.items.map((proposal) => (
                  <ProposalReviewCard
                    key={proposal.id}
                    proposal={proposal}
                    currentRole={currentRole}
                    timelineStart={timelineStart}
                    timelineEnd={timelineEnd}
                    busy={busyId === proposal.id}
                    onSaveSchedule={saveSchedule}
                    onDecision={decide}
                  />
                ))}
              </section>
            ))
          ) : (
            <div className="mx-5 mt-6 rounded-xl border border-dashed border-border bg-muted/35 px-5 py-8 text-center">
              <Inbox className="mx-auto size-7 text-muted-foreground/60" />
              <p className="mt-3 text-sm font-semibold text-foreground">Không có đề xuất trong nhóm này</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Chọn trạng thái hoặc ngày khác để xem các đề xuất còn lại.
              </p>
            </div>
          )}
        </div>

        {data && data.totalPages > 1 ? (
          <footer className="flex items-center justify-between border-t border-border px-5 py-4">
            <p className="text-xs text-muted-foreground">
              Trang {data.number + 1}/{data.totalPages} · {data.totalElements} đề xuất
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                aria-label="Trang trước"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                disabled={page + 1 >= data.totalPages || loading}
                onClick={() => setPage((current) => current + 1)}
                aria-label="Trang sau"
                className="flex size-9 items-center justify-center rounded-lg border border-border text-foreground disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function formatWeekday(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const formatted = weekdayFormatter.format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function groupProposals(proposals: TimelineProposal[]) {
  const groups = new Map<string, TimelineProposal[]>();
  for (const proposal of proposals) {
    const date = proposalDateKey(proposal);
    const key = date || "UNSCHEDULED";
    const current = groups.get(key) || [];
    current.push(proposal);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .sort(([first], [second]) => {
      if (first === "UNSCHEDULED") return 1;
      if (second === "UNSCHEDULED") return -1;
      return first.localeCompare(second);
    })
    .map(([key, items]) => ({
      key,
      label: key === "UNSCHEDULED" ? "Chưa chọn thời gian" : formatWeekday(key),
      items,
    }));
}

function proposalDateKey(proposal: TimelineProposal) {
  const value = proposal.payload.startTime;
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
