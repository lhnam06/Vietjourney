import { AlertTriangle, Clock3 } from "lucide-react";
import type { TimelineProposal } from "../lib/timelineApi";
import { cn } from "../lib/utils";

interface ProposalGhostCardProps {
  proposal: TimelineProposal;
  dayIndex: number;
  stackIndex: number;
  hourHeight: number;
}

export function ProposalGhostCard({ proposal, dayIndex, stackIndex, hourHeight }: ProposalGhostCardProps) {
  const start = proposalDate(proposal.payload.startTime);
  const end = proposalDate(proposal.payload.endTime);
  if (!start || !end || end <= start) return null;

  const inset = 3 + Math.min(stackIndex, 2) * 2;
  const top = (start.getHours() * 60 + start.getMinutes()) * (hourHeight / 60) + Math.min(stackIndex, 2) * 3;
  const height = Math.max(38, ((end.getTime() - start.getTime()) / 60000) * (hourHeight / 60));
  const width = `calc((100% / 7) - ${inset * 2}px)`;
  const left = `calc(${dayIndex} * (100% / 7) + ${inset}px)`;
  const conflict = proposal.reviewState === "CONFLICT";

  return (
    <article
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute z-[15] overflow-hidden rounded-xl border-2 border-dashed px-3 py-2 opacity-70",
        conflict
          ? "border-amber-500/75 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-primary/65 bg-primary/10 text-primary",
      )}
      style={{ left, top, width, height }}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {conflict ? <AlertTriangle className="size-3.5 shrink-0" /> : <Clock3 className="size-3.5 shrink-0" />}
        <p className="truncate text-[11px] font-extrabold">
          {proposal.placeName || "Địa điểm được đề xuất"}
        </p>
      </div>
      {height >= 58 ? (
        <p className="mt-1 truncate text-[10px] font-semibold opacity-80">
          {proposal.authorUsername} · {formatTime(start)}-{formatTime(end)}
        </p>
      ) : null}
    </article>
  );
}

function proposalDate(value: unknown) {
  if (typeof value !== "string" || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
