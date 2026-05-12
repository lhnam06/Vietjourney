import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { Button } from '../components/ui/button';
import TripTimetable from '../components/TripTimetable';
import { mockLocations, mockTimeline, mockTransactions, mockTrips, type TimelineItem, type Trip } from '../data/mockData';
import { eachTripDay, layoutsByDate } from '../lib/timetableLayout';
import { loadExtraLocations, loadTripData, saveTripData, setLastTripId } from '../lib/tripStorage';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { toast } from 'sonner';
import { ApiError } from '../lib/api';
import { getTimelineDetail, mapApiTimelineToTimetable, moveTimelineEvent } from '../lib/timelineApi';

type RemoteTimetableState = {
  items: TimelineItem[];
  labels: Record<string, string>;
  meta: ReturnType<typeof mapApiTimelineToTimetable>['tripMeta'];
};

export default function Timetable() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam ?? 'trip-1';
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [remoteTimetable, setRemoteTimetable] = useState<RemoteTimetableState | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [localTimelineOverride, setLocalTimelineOverride] = useState<TimelineItem[] | null>(null);

  useEffect(() => {
    setLastTripId(tripId);
  }, [tripId]);

  useEffect(() => {
    setLocalTimelineOverride(null);
  }, [tripId]);

  useEffect(() => {
    if (remoteTimetable) setLocalTimelineOverride(null);
  }, [remoteTimetable]);

  const localTimeline = useMemo(() => {
    const stored = typeof window !== 'undefined' ? loadTripData(tripId) : null;
    return stored?.timeline?.length ? stored.timeline : mockTimeline;
  }, [tripId]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setRemoteTimetable(null);
      setRemoteLoading(false);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setRemoteTimetable(null);
      setRemoteLoading(false);
      return;
    }

    let cancelled = false;
    setRemoteLoading(true);
    (async () => {
      try {
        const detail = await getTimelineDetail(tripId, token);
        if (cancelled) return;
        const mapped = mapApiTimelineToTimetable(detail);
        setRemoteTimetable({
          items: mapped.items,
          labels: mapped.labelByLocationId,
          meta: mapped.tripMeta,
        });
      } catch {
        if (!cancelled) setRemoteTimetable(null);
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tripId, isAuthenticated, authLoading]);

  const refreshRemoteTimetable = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    const detail = await getTimelineDetail(tripId, token);
    const mapped = mapApiTimelineToTimetable(detail);
    setRemoteTimetable({
      items: mapped.items,
      labels: mapped.labelByLocationId,
      meta: mapped.tripMeta,
    });
  }, [tripId]);

  const handleBackendMoveEvent = useCallback(
    async (payload: { eventId: string; startIso: string; endIso: string }) => {
      const token = getStoredToken();
      if (!token) return;
      try {
        await moveTimelineEvent(
          tripId,
          payload.eventId,
          { startTime: payload.startIso, endTime: payload.endIso },
          token
        );
        await refreshRemoteTimetable();
        toast.success('Đã cập nhật lịch');
      } catch (e) {
        if (e instanceof ApiError) toast.error(e.message);
        else toast.error('Không thể cập nhật lịch');
      }
    },
    [tripId, refreshRemoteTimetable]
  );

  const timelineItems = remoteTimetable?.items ?? localTimelineOverride ?? localTimeline;

  const handleScheduleMove = useCallback(
    async (payload: { eventId: string; startIso: string; endIso: string }) => {
      if (remoteTimetable) {
        await handleBackendMoveEvent(payload);
        return;
      }

      const date = payload.startIso.slice(0, 10);
      const startTime = payload.startIso.slice(11, 16);
      const endTime = payload.endIso.slice(11, 16);

      const current = localTimelineOverride ?? localTimeline;
      const block = current.find((t) => t.id === payload.eventId);
      if (
        block &&
        payload.startIso === `${block.date}T${block.startTime}:00` &&
        payload.endIso === `${block.date}T${block.endTime}:00`
      ) {
        return;
      }

      const next = current.map((it) =>
        it.id === payload.eventId ? { ...it, date, startTime, endTime } : it
      );
      setLocalTimelineOverride(next);

      try {
        const stored = loadTripData(tripId);
        const tripRow = stored?.trip ?? mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
        saveTripData(tripId, {
          trip: tripRow,
          timeline: next,
          transactions: stored?.transactions ?? mockTransactions,
        });
      } catch {
        /* ignore */
      }
      toast.success('Đã cập nhật lịch');
    },
    [remoteTimetable, handleBackendMoveEvent, localTimelineOverride, localTimeline, tripId]
  );

  const trip: Trip = useMemo(() => {
    if (remoteTimetable) {
      const m = remoteTimetable.meta;
      const mock = mockTrips.find((t) => t.id === tripId);
      return {
        id: tripId,
        name: m.title,
        destination: m.destination || m.title,
        coverImage: mock?.coverImage ?? '',
        startDate: m.startDate,
        endDate: m.endDate,
        participants: mock?.participants ?? [],
        totalBudget: mock?.totalBudget ?? 0,
      };
    }
    return mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  }, [remoteTimetable, tripId]);

  const days = useMemo(
    () => eachTripDay(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const layoutByDate = useMemo(() => layoutsByDate(timelineItems), [timelineItems]);

  const extraById = useMemo(() => loadExtraLocations(tripId), [tripId]);

  const apiLabels = remoteTimetable?.labels;

  const getLabel = (block: { locationId: string }) =>
    apiLabels?.[block.locationId] ??
    extraById[block.locationId]?.name ??
    mockLocations.find((l) => l.id === block.locationId)?.name ??
    'Hoạt động';

  const showRemoteLoading = isAuthenticated && (authLoading || remoteLoading);

  return (
    <div className="h-full bg-[var(--vj-bg)] overflow-auto font-[family-name:var(--vj-font)]">
      <div className="max-w-[var(--vj-content-max)] mx-auto w-full px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)] space-y-[var(--vj-stack-gap)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-8 -ml-2 text-[var(--vj-accent)]" asChild>
                <Link to={`/workspace/${tripId}`}>
                  <ArrowLeft className="size-4 mr-1" />
                  Lịch trình chi tiết
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-[var(--vj-text-on-dark)] flex items-center gap-2 tracking-tight">
              <CalendarRange className="size-7 text-[var(--vj-accent)] shrink-0" />
              Thời khoá biểu chuyến đi
            </h1>
            <p className="text-sm text-[var(--vj-text-on-dark-muted)] mt-1">
              <span className="font-semibold text-[var(--vj-text-on-dark)]">{trip.name}</span>
              {trip.destination ? (
                <>
                  <span className="text-[var(--vj-text-on-dark-muted)]"> · </span>
                  {trip.destination}
                </>
              ) : null}
            </p>
            <p className="text-xs text-[var(--vj-text-on-dark-muted)] mt-2 tabular-nums">
              {trip.startDate} → {trip.endDate}
            </p>
            {remoteTimetable ? (
              <p className="text-[11px] font-medium text-[var(--vj-accent-2)] mt-1.5">
                Đang hiển thị lịch từ máy chủ
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild className="border-[var(--vj-border)] bg-[var(--vj-surface)]/90">
              <Link to={`/budget/${tripId}`}>Ngân sách</Link>
            </Button>
            <Button className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white" asChild>
              <Link to={`/workspace/${tripId}`}>Chỉnh trong lịch trình</Link>
            </Button>
          </div>
        </div>

        {showRemoteLoading ? (
          <div className="rounded-2xl border border-[var(--vj-border)] bg-[var(--vj-surface)] px-6 py-14 text-center text-[var(--vj-primary)] font-medium shadow-lg">
            Đang tải lịch từ máy chủ…
          </div>
        ) : days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--vj-border)] bg-[var(--vj-surface)]/80 p-8 text-center text-[var(--vj-primary)]">
            Chuyến đi chưa có khoảng ngày hợp lệ.
          </div>
        ) : (
          <TripTimetable
            days={days}
            layoutByDate={layoutByDate}
            getLabel={getLabel}
            dragRescheduleEnabled
            dragPersistTarget={remoteTimetable ? 'server' : 'local'}
            onScheduleMove={handleScheduleMove}
            onSelectBlock={(date) =>
              navigate(`/workspace/${tripId}?date=${encodeURIComponent(date)}`)
            }
          />
        )}
      </div>
    </div>
  );
}
