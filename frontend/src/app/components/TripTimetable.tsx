import type { TimetableBlock } from '../lib/timetableLayout';
import {
  TIMETABLE_DAY_START_HOUR,
  TIMETABLE_DAY_END_HOUR,
  daySpanMinutes,
  PX_PER_HOUR,
} from '../lib/timetableLayout';

type Props = {
  days: string[];
  layoutByDate: Map<string, TimetableBlock[]>;
  getLabel: (block: TimetableBlock) => string;
  onSelectBlock?: (date: string, block: TimetableBlock) => void;
};

const dayStartMin = TIMETABLE_DAY_START_HOUR * 60;
const totalMin = daySpanMinutes();
const columnHeight = ((TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * PX_PER_HOUR);

export default function TripTimetable({ days, layoutByDate, getLabel, onSelectBlock }: Props) {
  const hours: number[] = [];
  for (let h = TIMETABLE_DAY_START_HOUR; h < TIMETABLE_DAY_END_HOUR; h++) hours.push(h);

  return (
    <div className="rounded-2xl border border-[var(--vj-border)] bg-[var(--vj-surface)] shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="flex min-w-fit">
          {/* Time gutter */}
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-slate-200 bg-slate-50/95 backdrop-blur-sm"
            style={{ width: 52 }}
          >
            <div className="h-11 border-b border-slate-200 flex items-end justify-center pb-1 bg-slate-100/80 sticky top-0 z-30">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Giờ</span>
            </div>
            <div className="relative" style={{ height: columnHeight }}>
              {hours.map((h) => {
                const top = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-right pr-2 text-xs font-medium text-slate-500 tabular-nums border-t border-slate-200/90"
                    style={{ top, height: PX_PER_HOUR }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day columns */}
          {days.map((date) => {
            const blocks = layoutByDate.get(date) ?? [];
            const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', {
              weekday: 'short',
              day: 'numeric',
              month: 'numeric',
            });
            return (
              <div
                key={date}
                className="shrink-0 border-r border-slate-200 last:border-r-0 w-[min(100vw,200px)] sm:w-44 md:w-52"
              >
                <div className="h-11 border-b border-slate-200 px-2 flex flex-col justify-center bg-[color-mix(in_oklab,var(--vj-primary)_8%,white)] sticky top-0 z-10">
                  <span className="text-xs font-extrabold text-[var(--vj-primary)] capitalize leading-tight truncate">
                    {label}
                  </span>
                  <span className="text-[10px] text-slate-500 tabular-nums">{date}</span>
                </div>
                <div className="relative bg-white" style={{ height: columnHeight }}>
                  {hours.map((h) => {
                    const y = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
                    return (
                      <div
                        key={h}
                        className="absolute left-0 right-0 pointer-events-none border-t border-slate-100"
                        style={{ top: y }}
                      />
                    );
                  })}
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
                        className="absolute rounded-lg border border-[var(--vj-accent)]/40 shadow-sm px-1.5 py-1 text-left overflow-hidden transition hover:brightness-[1.02] hover:ring-2 hover:ring-[var(--vj-accent)]/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-accent)]"
                        style={{
                          top: `${topPct}%`,
                          height: `max(${hPct}%, 28px)`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${laneW}% - 4px)`,
                          background:
                            'linear-gradient(135deg, color-mix(in oklab, var(--vj-primary) 18%, white), color-mix(in oklab, var(--vj-accent) 12%, white))',
                        }}
                        title={`${b.startTime} – ${b.endTime}`}
                      >
                        <span className="block text-[11px] font-extrabold text-slate-900 line-clamp-2 leading-snug">
                          {getLabel(b)}
                        </span>
                        <span className="block text-[10px] text-slate-600 tabular-nums mt-0.5">
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
      <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-200 bg-slate-50/80">
        Khung giờ {TIMETABLE_DAY_START_HOUR}:00–{TIMETABLE_DAY_END_HOUR}:00. Bấm một ô để mở chuyến đi cùng ngày.
      </p>
    </div>
  );
}
