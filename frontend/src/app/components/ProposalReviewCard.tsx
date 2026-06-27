import { useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, Check, Clock3, Loader2, Pencil, X } from "lucide-react";
import type {
  TimelineMemberRole,
  TimelineProposal,
  TimelineProposalStatus,
} from "../lib/timelineApi";
import { cn } from "../lib/utils";

interface ProposalReviewCardProps {
  proposal: TimelineProposal;
  currentRole: TimelineMemberRole | null;
  timelineStart: string;
  timelineEnd: string;
  busy: boolean;
  onSaveSchedule: (proposal: TimelineProposal, startTime: string, endTime: string) => Promise<boolean>;
  onDecision: (proposal: TimelineProposal, status: "ACCEPTED" | "REJECTED") => Promise<void>;
}

const dateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function ProposalReviewCard({
  proposal,
  currentRole,
  timelineStart,
  timelineEnd,
  busy,
  onSaveSchedule,
  onDecision,
}: ProposalReviewCardProps) {
  const [editing, setEditing] = useState(false);
  const initialSchedule = scheduleParts(proposal, timelineStart);
  const [date, setDate] = useState(initialSchedule.date);
  const [start, setStart] = useState(initialSchedule.start);
  const [end, setEnd] = useState(initialSchedule.end);
  const [formError, setFormError] = useState<string | null>(null);
  const canReview = currentRole === "OWNER" || currentRole === "EDITOR";
  const pending = proposal.status === "PENDING";
  const canApprove = pending && proposal.reviewState === "READY";

  function beginEditing() {
    const next = scheduleParts(proposal, timelineStart);
    setDate(next.date);
    setStart(next.start);
    setEnd(next.end);
    setFormError(null);
    setEditing(true);
  }

  async function submitSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startTime = `${date}T${start}:00`;
    const endTime = `${date}T${end}:00`;
    if (!date || !start || !end || new Date(startTime) >= new Date(endTime)) {
      setFormError("Giờ kết thúc phải sau giờ bắt đầu.");
      return;
    }
    setFormError(null);
    if (await onSaveSchedule(proposal, startTime, endTime)) {
      setEditing(false);
    }
  }

  return (
    <article className="border-b border-border px-5 py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="truncate text-sm font-bold text-foreground">
            {proposal.placeName || destinationFallback(proposal)}
          </h4>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {proposal.authorUsername} · {formatSchedule(proposal)}
          </p>
          {proposal.placeAddress ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground/80">
              {proposal.placeAddress}
            </p>
          ) : null}
        </div>
        <StateBadge proposal={proposal} />
      </div>

      {proposal.conflictReason ? (
        <div className="mt-3 flex gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{proposal.conflictReason}</span>
        </div>
      ) : null}

      {editing ? (
        <form onSubmit={submitSchedule} className="mt-4 space-y-3 rounded-xl bg-muted/55 p-3">
          <label className="block text-xs font-semibold text-foreground">
            Ngày
            <input
              type="date"
              min={timelineStart}
              max={timelineEnd}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-semibold text-foreground">
              Bắt đầu
              <input
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="block text-xs font-semibold text-foreground">
              Kết thúc
              <input
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className="mt-1.5 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          </div>
          {formError ? <p className="text-xs font-medium text-destructive">{formError}</p> : null}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-background"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarClock className="size-3.5" />}
              Lưu thời gian
            </button>
          </div>
        </form>
      ) : null}

      {canReview && pending && !editing ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={beginEditing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:border-primary/35 hover:text-primary disabled:opacity-60"
          >
            <Pencil className="size-3.5" />
            {proposal.reviewState === "UNSCHEDULED" ? "Chọn thời gian" : "Điều chỉnh giờ"}
          </button>
          <button
            type="button"
            disabled={busy || !canApprove}
            onClick={() => void onDecision(proposal, "ACCEPTED")}
            title={canApprove ? undefined : "Cần chọn thời gian hợp lệ và xử lý xung đột trước"}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            Chấp nhận
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onDecision(proposal, "REJECTED")}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
          >
            <X className="size-3.5" />
            Từ chối
          </button>
        </div>
      ) : null}

      {!canReview && pending ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="size-3.5 text-amber-500" />
          Đang chờ chủ chuyến đi hoặc biên tập viên xử lý.
        </p>
      ) : null}

      {!pending ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Xử lý lúc {formatDateTime(proposal.updatedAt || proposal.createdAt)}
        </p>
      ) : null}
    </article>
  );
}

function StateBadge({ proposal }: { proposal: TimelineProposal }) {
  const config = proposal.status === "ACCEPTED"
    ? { label: "Đã chấp nhận", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" }
    : proposal.status === "REJECTED"
      ? { label: "Đã từ chối", className: "bg-destructive/10 text-destructive" }
      : proposal.status === "OUTDATED"
        ? { label: "Đã quá hạn", className: "bg-muted text-muted-foreground" }
        : proposal.reviewState === "CONFLICT"
          ? { label: "Có xung đột", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
          : proposal.reviewState === "UNSCHEDULED"
            ? { label: "Chưa chọn giờ", className: "bg-sky-500/10 text-sky-700 dark:text-sky-300" }
            : { label: "Chờ duyệt", className: "bg-primary/10 text-primary" };

  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold", config.className)}>
      {config.label}
    </span>
  );
}

function scheduleParts(proposal: TimelineProposal, fallbackDate: string) {
  const startDate = proposalDate(proposal.payload.startTime);
  const endDate = proposalDate(proposal.payload.endTime);
  return {
    date: startDate ? dateInput(startDate) : fallbackDate,
    start: startDate ? timeInput(startDate) : "09:00",
    end: endDate ? timeInput(endDate) : "10:30",
  };
}

function formatSchedule(proposal: TimelineProposal) {
  const start = proposalDate(proposal.payload.startTime);
  const end = proposalDate(proposal.payload.endTime);
  if (!start || !end) return "Chưa chọn thời gian";
  return `${dateTimeFormatter.format(start)} - ${timeInput(end)}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "vừa xong" : dateTimeFormatter.format(date);
}

function destinationFallback(proposal: TimelineProposal) {
  const placeId = typeof proposal.payload.externalPlaceId === "string" ? proposal.payload.externalPlaceId : "";
  return placeId ? `Địa điểm ${placeId}` : "Địa điểm được đề xuất";
}

function proposalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timeInput(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
