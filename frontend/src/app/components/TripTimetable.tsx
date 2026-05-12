import { useCallback, useRef, useState, type Ref } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical } from 'lucide-react';
import type { TimetableBlock } from '../lib/timetableLayout';
import {
  TIMETABLE_DAY_START_HOUR,
  TIMETABLE_DAY_END_HOUR,
  daySpanMinutes,
  PX_PER_HOUR,
  timeToMinutes,
} from '../lib/timetableLayout';

const ITEM_TYPE = 'VIETJOURNEY_TIMETABLE_EVENT';
const SNAP_MIN = 15;

type Props = {
  days: string[];
  layoutByDate: Map<string, TimetableBlock[]>;
  getLabel: (block: TimetableBlock) => string;
  onSelectBlock?: (date: string, block: TimetableBlock) => void;
  /** Grip + drop to change time/day (mock: localStorage; server timeline: PATCH move). */
  dragRescheduleEnabled?: boolean;
  dragPersistTarget?: 'server' | 'local';
  onScheduleMove?: (payload: { eventId: string; startIso: string; endIso: string }) => void | Promise<void>;
};

type DragItem = { eventId: string; durationMinutes: number };

const dayStartMin = TIMETABLE_DAY_START_HOUR * 60;
const totalMin = daySpanMinutes();
const columnHeight = (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * PX_PER_HOUR;

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function minutesToIso(ymd: string, minutesFromMidnight: number): string {
  const h = Math.floor(minutesFromMidnight / 60);
  const mi = minutesFromMidnight % 60;
  return `${ymd}T${pad2(h)}:${pad2(mi)}:00`;
}

function snapMin(m: number) {
  return Math.round(m / SNAP_MIN) * SNAP_MIN;
}

function TimetableEventBlock({
  date,
  b,
  getLabel,
  onSelectBlock,
  dragRescheduleEnabled,
  timetableDragLock,
  onTimetableDragLock,
  topPx,
  heightPx,
  laneW,
  leftPct,
}: {
  date: string;
  b: TimetableBlock;
  getLabel: (block: TimetableBlock) => string;
  onSelectBlock?: (date: string, block: TimetableBlock) => void;
  dragRescheduleEnabled: boolean;
  timetableDragLock: boolean;
  onTimetableDragLock: (locked: boolean) => void;
  /** Pixel offset from grid top — same formula as hour lines to avoid % rounding drift */
  topPx: number;
  heightPx: number;
  laneW: number;
  leftPct: number;
}) {
  const durationMinutes = Math.max(
    SNAP_MIN,
    timeToMinutes(b.endTime) - timeToMinutes(b.startTime)
  );

  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: (): DragItem => {
      onTimetableDragLock(true);
      return { eventId: b.id, durationMinutes };
    },
    end: () => {
      onTimetableDragLock(false);
    },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: dragRescheduleEnabled,
  });

  const ptrTap = timetableDragLock ? 'pointer-events-none' : 'pointer-events-auto';

  return (
    <div
      ref={preview}
      className={`absolute z-10 rounded-xl border-2 border-[color-mix(in_oklab,var(--vj-accent)_55%,white)] shadow-md overflow-hidden transition hover:brightness-[1.03] hover:ring-2 hover:ring-[var(--vj-accent)]/35 pointer-events-none ${
        isDragging ? 'opacity-45 ring-2 ring-[var(--vj-accent)]/40' : ''
      }`}
      style={{
        top: topPx,
        height: Math.max(heightPx, 30),
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${laneW}% - 4px)`,
        background:
          'linear-gradient(145deg, color-mix(in oklab, var(--vj-primary) 14%, white), color-mix(in oklab, var(--vj-accent) 10%, white))',
      }}
      title={`${b.startTime} – ${b.endTime}`}
    >
      <div className="flex h-full min-h-[28px] gap-0.5 select-none pointer-events-none">
        {dragRescheduleEnabled ? (
          <div
            ref={drag as unknown as Ref<HTMLDivElement>}
            className={`flex-shrink-0 flex items-stretch cursor-grab active:cursor-grabbing touch-none text-[color-mix(in_oklab,var(--vj-primary)_35%,#94a3b8)] hover:text-[var(--vj-primary)] px-0.5 ${ptrTap}`}
            role="button"
            tabIndex={0}
            aria-label="Kéo để đổi giờ hoặc ngày"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
            }}
          >
            <GripVertical className="size-3.5 shrink-0 self-center" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onSelectBlock?.(date, b)}
          className={`flex-1 min-w-0 text-left px-1.5 py-1 overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-accent)] rounded-lg bg-transparent border-0 ${ptrTap}`}
        >
          <span className="block text-[13px] font-bold text-[var(--vj-primary)] line-clamp-2 leading-snug tracking-tight">
            {getLabel(b)}
          </span>
          <span className="block text-[11px] font-semibold text-[color-mix(in_oklab,var(--vj-accent)_40%,#334155)] tabular-nums mt-0.5">
            {b.startTime} – {b.endTime}
          </span>
        </button>
      </div>
    </div>
  );
}

function TimetableDayColumn({
  date,
  blocks,
  hours,
  getLabel,
  onSelectBlock,
  dragRescheduleEnabled,
  onGridDrop,
  timetableDragLock,
  onTimetableDragLock,
}: {
  date: string;
  blocks: TimetableBlock[];
  hours: number[];
  getLabel: (block: TimetableBlock) => string;
  onSelectBlock?: (date: string, block: TimetableBlock) => void;
  dragRescheduleEnabled: boolean;
  onGridDrop?: (payload: { eventId: string; startIso: string; endIso: string }) => void;
  timetableDragLock: boolean;
  onTimetableDragLock: (locked: boolean) => void;
}) {
  const gridRef = useRef<HTMLDivElement | null>(null);

  const [{ isOver }, drop] = useDrop({
    accept: ITEM_TYPE,
    drop(item: DragItem, monitor) {
      if (!onGridDrop || !dragRescheduleEnabled) return;
      const offset = monitor.getClientOffset();
      const node = gridRef.current;
      if (!offset || !node) return;

      const rect = node.getBoundingClientRect();
      const y = offset.y - rect.top;
      const clampedY = Math.max(0, Math.min(columnHeight, y));
      const frac = clampedY / columnHeight;
      let startMin = dayStartMin + frac * totalMin;
      startMin = snapMin(startMin);

      const dur = Math.max(SNAP_MIN, item.durationMinutes);
      const dayEndMin = TIMETABLE_DAY_END_HOUR * 60;
      const maxStart = Math.max(dayStartMin, dayEndMin - dur);
      startMin = Math.max(dayStartMin, Math.min(maxStart, startMin));
      const endMin = startMin + dur;

      const startIso = minutesToIso(date, startMin);
      const endIso = minutesToIso(date, endMin);
      onGridDrop({ eventId: item.eventId, startIso, endIso });
    },
    collect: (monitor) => ({ isOver: monitor.isOver({ shallow: true }) }),
  });

  const setGridRef = useCallback(
    (node: HTMLDivElement | null) => {
      gridRef.current = node;
      drop(node);
    },
    [drop]
  );

  const label = new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
  });

  return (
    <div className="shrink-0 border-r border-[color-mix(in_oklab,var(--vj-primary)_12%,white)] last:border-r-0 w-[min(92vw,18rem)] sm:w-80 md:w-96">
      <div className="h-12 border-b border-[color-mix(in_oklab,var(--vj-primary)_15%,white)] px-2.5 flex flex-col justify-center bg-[color-mix(in_oklab,var(--vj-primary)_12%,white)] sticky top-0 z-10">
        <span className="text-[13px] font-bold text-[var(--vj-primary)] capitalize leading-tight truncate tracking-tight">
          {label}
        </span>
        <span className="text-[11px] font-medium text-[color-mix(in_oklab,var(--vj-primary)_48%,#64748b)] tabular-nums">
          {date}
        </span>
      </div>
      <div
        ref={setGridRef}
        data-timetable-day={date}
        className={`relative z-0 bg-[color-mix(in_oklab,var(--vj-primary)_3%,white)] ${
          isOver && dragRescheduleEnabled ? 'ring-2 ring-inset ring-[var(--vj-accent)]/45' : ''
        }`}
        style={{ height: columnHeight }}
      >
        {hours.map((h) => {
          const y = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
          return (
            <div
              key={h}
              className="absolute left-0 right-0 pointer-events-none border-t border-[color-mix(in_oklab,var(--vj-primary)_8%,transparent)]"
              style={{ top: y }}
            />
          );
        })}
        {blocks.map((b) => {
          const topPx = ((b.startMin - dayStartMin) / totalMin) * columnHeight;
          const heightPx = ((b.endMin - b.startMin) / totalMin) * columnHeight;
          const laneW = 100 / b.laneCount;
          const leftPct = b.lane * laneW;

          return (
            <TimetableEventBlock
              key={b.id}
              date={date}
              b={b}
              getLabel={getLabel}
              onSelectBlock={onSelectBlock}
              dragRescheduleEnabled={dragRescheduleEnabled}
              timetableDragLock={timetableDragLock}
              onTimetableDragLock={onTimetableDragLock}
              topPx={topPx}
              heightPx={heightPx}
              laneW={laneW}
              leftPct={leftPct}
            />
          );
        })}
      </div>
    </div>
  );
}

function TripTimetableInner({
  days,
  layoutByDate,
  getLabel,
  onSelectBlock,
  dragRescheduleEnabled = false,
  dragPersistTarget = 'local',
  onScheduleMove,
}: Props) {
  const hours: number[] = [];
  for (let h = TIMETABLE_DAY_START_HOUR; h < TIMETABLE_DAY_END_HOUR; h++) hours.push(h);

  const [timetableDragLock, setTimetableDragLock] = useState(false);
  const onTimetableDragLock = useCallback((locked: boolean) => {
    setTimetableDragLock(locked);
  }, []);

  const handleGridDrop = useCallback(
    (payload: { eventId: string; startIso: string; endIso: string }) => {
      if (!onScheduleMove) return;
      const block = [...layoutByDate.values()]
        .flat()
        .find((x) => x.id === payload.eventId);
      if (block) {
        const unchanged =
          payload.startIso === `${block.date}T${block.startTime}:00` &&
          payload.endIso === `${block.date}T${block.endTime}:00`;
        if (unchanged) return;
      }
      void onScheduleMove(payload);
    },
    [layoutByDate, onScheduleMove]
  );

  return (
    <div className="rounded-2xl border border-[var(--vj-border)] bg-[var(--vj-surface)] shadow-lg overflow-hidden flex flex-col max-h-[min(calc(100vh-var(--vj-scroll-chrome)),56rem)] font-[family-name:var(--vj-font)] antialiased">
      {/* Vertical scroll wraps hour column + day strip so rows stay aligned; horizontal scroll only under days so "Giờ" stays fixed */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-x-contain">
        <div className="flex min-h-min items-stretch">
          <div
            className="sticky left-0 z-20 shrink-0 border-r border-[color-mix(in_oklab,var(--vj-primary)_18%,white)] bg-[color-mix(in_oklab,var(--vj-primary)_7%,white)] backdrop-blur-sm"
            style={{ width: 64 }}
          >
            <div className="h-12 border-b border-[color-mix(in_oklab,var(--vj-primary)_15%,white)] flex items-end justify-center pb-1.5 bg-[color-mix(in_oklab,var(--vj-primary)_10%,white)] sticky top-0 z-30">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[color-mix(in_oklab,var(--vj-primary)_50%,#64748b)]">
                Giờ
              </span>
            </div>
            <div className="relative" style={{ height: columnHeight }}>
              {hours.map((h) => {
                const top = ((h * 60 - dayStartMin) / totalMin) * columnHeight;
                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 text-right pr-2.5 text-[12px] font-semibold tabular-nums text-[color-mix(in_oklab,var(--vj-primary)_42%,#475569)] border-t border-[color-mix(in_oklab,var(--vj-primary)_12%,transparent)] leading-none pt-1"
                    style={{ top, height: PX_PER_HOUR }}
                  >
                    {String(h).padStart(2, '0')}:00
                  </div>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto overflow-y-clip">
            <div className="flex min-w-fit h-full">
              {days.map((date) => (
                <TimetableDayColumn
                  key={date}
                  date={date}
                  blocks={layoutByDate.get(date) ?? []}
                  hours={hours}
                  getLabel={getLabel}
                  onSelectBlock={onSelectBlock}
                  dragRescheduleEnabled={dragRescheduleEnabled}
                  onGridDrop={dragRescheduleEnabled && onScheduleMove ? handleGridDrop : undefined}
                  timetableDragLock={timetableDragLock}
                  onTimetableDragLock={onTimetableDragLock}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="text-[12px] font-medium text-[color-mix(in_oklab,var(--vj-primary)_45%,#64748b)] px-4 py-2.5 border-t border-[color-mix(in_oklab,var(--vj-primary)_14%,white)] bg-[color-mix(in_oklab,var(--vj-primary)_6%,white)]">
        {dragRescheduleEnabled && dragPersistTarget === 'server'
          ? `Kéo biểu tượng ⋮⋮ để đổi giờ hoặc thả sang ngày khác (lưu lên máy chủ). Khung ${TIMETABLE_DAY_START_HOUR}:00–${TIMETABLE_DAY_END_HOUR}:00.`
          : dragRescheduleEnabled && dragPersistTarget === 'local'
            ? `Kéo biểu tượng ⋮⋮ để đổi giờ hoặc thả sang ngày khác (lưu trên thiết bị). Khung ${TIMETABLE_DAY_START_HOUR}:00–${TIMETABLE_DAY_END_HOUR}:00.`
            : `Khung giờ ${TIMETABLE_DAY_START_HOUR}:00–${TIMETABLE_DAY_END_HOUR}:00. Bấm một ô để mở lịch trình cùng ngày.`}
      </p>
    </div>
  );
}

export default function TripTimetable(props: Props) {
  return (
    <DndProvider backend={HTML5Backend}>
      <TripTimetableInner {...props} />
    </DndProvider>
  );
}
