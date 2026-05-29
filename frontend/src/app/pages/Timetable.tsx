import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarRange, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import TripTimetable from '../components/TripTimetable';
import { mockLocations } from '../data/mockData';
import { eachTripDay, layoutsByDate } from '../lib/timetableLayout';
import { setLastTripId } from '../lib/tripStorage';
import { cacheGet, cacheSet, cacheIsStale } from '../lib/apiCache';
import { useAuth } from '../context/AuthContext';
import { getTimelineDetail, mapApiTimelineToTimetable } from '../lib/timelineApi';
import { useTimelineSocket } from '../hooks/useTimelineSocket';
import { toast } from 'sonner';
import { getStoredToken } from '../lib/authApi';

export default function Timetable() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam ?? 'trip-1';
  const navigate = useNavigate();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const token = getStoredToken();
  const { lastMessage } = useTimelineSocket(tripId, token ?? "dummy_token");

  const CACHE_KEY = `timeline:${tripId}`;
  const cachedDetail = cacheGet<{ items: any[]; tripMeta: any; labelByLocationId: Record<string, string> }>(CACHE_KEY);

  const [timelineItems, setTimelineItems] = useState<any[]>(cachedDetail?.items ?? []);
  const [labelByLocationId, setLabelByLocationId] = useState<Record<string, string>>(cachedDetail?.labelByLocationId ?? {});
  const [tripMetadata, setTripMetadata] = useState<any>(cachedDetail?.tripMeta ?? null);
  const [isLoading, setIsLoading] = useState(!cachedDetail);

  const fetchTimeline = async (signal?: AbortSignal) => {
    if (!token || !tripId || tripId === 'undefined' || (tripId === 'trip-1' && !isAuthenticated)) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const detail = await getTimelineDetail(tripId, token, signal);
      if (detail) {
        const { items, tripMeta, labelByLocationId: labels } = mapApiTimelineToTimetable(detail);
        setTimelineItems(items);
        setLabelByLocationId(labels);
        setTripMetadata(tripMeta);
        cacheSet(CACHE_KEY, { items, tripMeta, labelByLocationId: labels });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error("[Timetable] Failed to fetch:", error);
      toast.error("Không thể tải dữ liệu thời khóa biểu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setLastTripId(tripId);
    if (!cacheIsStale(CACHE_KEY) && cacheGet(CACHE_KEY)) return;
    const controller = new AbortController();
    fetchTimeline(controller.signal);
    return () => controller.abort();
  }, [tripId, token, authLoading]);

  useEffect(() => {
    if (lastMessage) {
      fetchTimeline();
    }
  }, [lastMessage]);

  const trip = useMemo(() => {
    return tripMetadata || { name: 'Đang tải...', destination: '', startDate: '', endDate: '' };
  }, [tripMetadata]);

  const days = useMemo(
    () => (trip.startDate && trip.endDate ? eachTripDay(trip.startDate, trip.endDate) : []),
    [trip.startDate, trip.endDate]
  );

  const layoutByDate = useMemo(() => layoutsByDate(timelineItems), [timelineItems]);

  const getLabel = (block: { locationId: string }) =>
    labelByLocationId[block.locationId] ||
    mockLocations.find((l) => l.id === block.locationId)?.name ||
    'Hoạt động';

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-white to-emerald-50/50 text-slate-900">
      <div className="max-w-[var(--vj-content-max)] mx-auto w-full px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)] space-y-[var(--vj-stack-gap)]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-[var(--vj-inset)] shadow-[0_20px_55px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-8 -ml-2 text-[var(--vj-primary)] hover:bg-emerald-50 hover:text-[var(--vj-primary)]" asChild>
                <Link to={`/workspace/${tripId}`}>
                  <ArrowLeft className="size-4 mr-1" />
                  Lịch trình chi tiết
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-[var(--vj-primary)] flex items-center gap-2">
              <CalendarRange className="size-7 text-[var(--vj-accent)] shrink-0" />
              Thời khoá biểu chuyến đi
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-medium">
              <span className="font-semibold text-slate-800">{trip.name}</span>
              <span className="text-slate-400"> · </span>
              {trip.destination}
            </p>
            <p className="text-xs text-slate-500 mt-2">
              {trip.startDate} → {trip.endDate}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to={`/budget/${tripId}`}>Ngân sách</Link>
            </Button>
            <Button className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white" asChild>
              <Link to={`/workspace/${tripId}`}>Chỉnh trong lịch trình</Link>
            </Button>
          </div>
        </div>
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white/90 flex flex-col items-center justify-center py-24 text-slate-500 shadow-sm">
            <Loader2 className="size-8 animate-spin mb-4 text-[var(--vj-accent)]" />
            <p className="text-sm font-medium">Đang cập nhật thời khóa biểu...</p>
          </div>
        ) : days.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/90 p-8 text-center text-slate-600 shadow-sm">
            Chuyến đi chưa có khoảng ngày hợp lệ hoặc chưa có dữ liệu.
          </div>
        ) : (
          <TripTimetable
            days={days}
            layoutByDate={layoutByDate}
            getLabel={getLabel}
            onSelectBlock={(date) =>
              navigate(`/workspace/${tripId}?date=${encodeURIComponent(date)}`)
            }
          />
        )}
      </div>
    </div>
  );
}
