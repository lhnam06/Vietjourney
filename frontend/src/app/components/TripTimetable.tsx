import type { TimetableBlock } from '../lib/timetableLayout';
import {
  TIMETABLE_DAY_START_HOUR,
  TIMETABLE_DAY_END_HOUR,
  daySpanMinutes,
  PX_PER_HOUR,
} from '../lib/timetableLayout';
import { Clock } from 'lucide-react';

type Props = {
  days: string[];
  layoutByDate: Map<string, TimetableBlock[]>;
  getLabel: (block: TimetableBlock) => string;
  onSelectBlock?: (date: string, block: TimetableBlock) => void;
};

const dayStartMin = TIMETABLE_DAY_START_HOUR * 60;
const totalMin = daySpanMinutes();
const columnHeight = (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * PX_PER_HOUR;

const formatDayHeader = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });

export default function TripTimetable({ days, layoutByDate, getLabel, onSelectBlock }: Props) {
  const hours: number[] = [];
  for (let h = TIMETABLE_DAY_START_HOUR; h < TIMETABLE_DAY_END_HOUR; h++) hours.push(h);

  return (
    <div className="flex max-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/90 bg-white text-slate-900 shadow-[0_24px_64px_rgba(15,23,42,0.08)]">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="flex min-w-fit">
          {/* Time gutter */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-white backdrop-blur-sm"
            style={{ width: 56 }}
          >
            <div className="sticky top-0 z-30 flex h-12 items-end justify-center border-b border-slate-200 bg-slate-100/90 pb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giờ</span>
            </div>
            <div className="relative" style={{ height: columnHeight }}>
              {hours.map((h, index) => {
                const top = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
                return (
                  <div
                    key={h}
                    className={`absolute left-0 right-0 border-t border-slate-200/70 pr-2.5 text-right text-xs font-semibold tabular-nums ${
                      index % 2 === 0 ? 'text-slate-600' : 'text-slate-400'
                    }`}
                    style={{ top, height: PX_PER_HOUR }}
                  >
                    <span className="inline-block translate-y-[-0.35rem]">{String(h).padStart(2, '0')}:00</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day columns */}
          {days.map((date) => {
            const blocks = layoutByDate.get(date) ?? [];
            const label = formatDayHeader(date);
            return (
              <div
                key={date}
                className="w-[min(100vw,13.5rem)] shrink-0 border-r border-slate-200/80 bg-white last:border-r-0 sm:w-48 md:w-56"
              >
                <div className="sticky top-0 z-10 flex h-12 flex-col justify-center border-b border-slate-200 bg-gradient-to-br from-[color-mix(in_oklab,var(--vj-primary)_12%,white)] to-white px-3">
                  <span className="truncate text-xs font-extrabold capitalize leading-tight text-[var(--vj-primary)]">
                    {label}
                  </span>
                  <span className="text-[10px] font-medium tabular-nums text-slate-500">{date}</span>
                </div>
                <div
                  className="relative bg-[linear-gradient(to_bottom,rgba(248,250,252,0.6)_0px,transparent_40px)]"
                  style={{ height: columnHeight }}
                >
                  {hours.map((h) => {
                    const y = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
                    return (
                      <div
                        key={h}
                        className="pointer-events-none absolute left-0 right-0 border-t border-slate-100/90"
                        style={{ top: y }}
                      />
                    );
                  })}

                  {blocks.length === 0 ? (
                    <div className="pointer-events-none absolute inset-x-3 top-10 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-3 py-6 text-center text-[11px] font-medium text-slate-500">
                      Chưa có hoạt động
                    </div>
                  ) : null}

                  {blocks.map((b) => {
                    const topPct = ((b.startMin - dayStartMin) / totalMin) * 100;
                    const hPct = ((b.endMin - b.startMin) / totalMin) * 100;
                    const laneW = 100 / b.laneCount;
                    const leftPct = b.lane * laneW;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => onSelectBlock?.(date, b)}
                        className="group/event absolute overflow-hidden rounded-xl border border-[var(--vj-accent)]/25 bg-white px-2 py-1.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:border-[var(--vj-accent)]/45 hover:shadow-[0_12px_28px_rgba(255,107,53,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-accent)]"
                        style={{
                          top: `${topPct}%`,
                          height: `max(${hPct}%, 36px)`,
                          left: `calc(${leftPct}% + 4px)`,
                          width: `calc(${laneW}% - 8px)`,
                        }}
                        title={`${b.startTime} – ${b.endTime}`}
                      >
                        <span
                          className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--vj-accent)]"
                          aria-hidden
                        />
                        <span className="block pl-2 text-[11px] font-extrabold leading-snug text-slate-900 line-clamp-2">
                          {getLabel(b)}
                        </span>
                        <span className="mt-0.5 flex items-center gap-1 pl-2 text-[10px] font-medium tabular-nums text-slate-600">
                          <Clock className="h-3 w-3 shrink-0 text-[var(--vj-accent)]" />
                          {b.startTime} – {b.endTime}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="border-t border-slate-200/90 bg-slate-50/95 px-4 py-2.5 text-xs font-medium text-slate-500">
        Khung giờ {TIMETABLE_DAY_START_HOUR}:00–{TIMETABLE_DAY_END_HOUR}:00 · Bấm một ô để mở lịch trình cùng ngày
      </p>
    </div>
  );
}
