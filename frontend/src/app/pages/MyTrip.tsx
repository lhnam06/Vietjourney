import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, CalendarRange, Compass, LayoutGrid, Loader2, Plus, Route, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { createTimeline, getMyTimelines, type ApiTimelineDetail } from '../lib/timelineApi';
import { getLastTripId, setLastTripId } from '../lib/tripStorage';
import { cacheGet, cacheSet, cacheIsStale, cacheClear } from '../lib/apiCache';
import { readTimelineCache, resolveTimelineLabels } from '../lib/timelineCache';
import { toast } from 'sonner';

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const rememberDiscoveryTrip = (timelineId: string) => {
  try {
    window.localStorage.setItem('vj:discovery:current-trip-id', JSON.stringify(timelineId));
  } catch {
    // Ignore storage errors.
  }
};

const TIMELINES_CACHE = 'profile:my-timelines';

type TripRouteTarget = 'discovery' | 'workspace';

const tripRouteSteps: Array<{
  target: TripRouteTarget;
  label: string;
  description: string;
  icon: typeof Compass;
  accentClass: string;
}> = [
  {
    target: 'discovery',
    label: 'Khám phá',
    description: 'Tìm & kéo địa điểm vào lịch',
    icon: Compass,
    accentClass: 'from-amber-500/15 to-orange-500/10 text-amber-900 border-amber-200/80',
  },
  {
    target: 'workspace',
    label: 'Workspace',
    description: 'Chỉnh lịch trình & bản đồ',
    icon: LayoutGrid,
    accentClass: 'from-emerald-500/15 to-teal-500/10 text-emerald-900 border-emerald-200/80',
  },
];

function TripScheduleSummary({
  timeline,
  onOpenDiscovery,
}: {
  timeline: ApiTimelineDetail;
  onOpenDiscovery: () => void;
}) {
  const cached = readTimelineCache(timeline.id);
  const labels = useMemo(() => resolveTimelineLabels(cached), [cached]);
  const previewRows = useMemo(() => {
    if (cached?.items.length) {
      return [...cached.items]
        .sort((a, b) => `${a.date}T${a.startTime}`.localeCompare(`${b.date}T${b.startTime}`))
        .slice(0, 4)
        .map((item) => ({
          key: item.id,
          label: labels[item.locationId] ?? 'Hoạt động',
          when: `${item.date} · ${item.startTime}${item.endTime ? `–${item.endTime}` : ''}`,
        }));
    }
    return (timeline.events ?? [])
      .filter((event) => event.startTime)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .slice(0, 4)
      .map((event) => ({
        key: event.id,
        label: event.place?.name?.trim() || 'Hoạt động',
        when: `${event.startTime.slice(0, 10)} · ${event.startTime.slice(11, 16)}`,
      }));
  }, [cached, labels, timeline.events, timeline.id]);

  const activityCount = cached?.items.length ?? timeline.events?.length ?? 0;

  return (
    <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
          <CalendarRange className="h-3.5 w-3.5" />
          Lịch trình · {activityCount} hoạt động
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 rounded-full px-2.5 text-xs text-[var(--vj-primary)] hover:bg-[var(--vj-primary)]/10"
          onClick={onOpenDiscovery}
        >
          Mở trên Khám phá
        </Button>
      </div>
      {previewRows.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {previewRows.map((row) => (
            <li key={row.key} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-800">{row.label}</span>
              <span className="shrink-0 text-slate-500">{row.when}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">
          Chưa có hoạt động — mở Khám phá và kéo địa điểm vào thời khoá biểu.
        </p>
      )}
    </div>
  );
}

function TripRouteNav({
  timelineId,
  onNavigate,
}: {
  timelineId: string;
  onNavigate: (id: string, target: TripRouteTarget) => void;
}) {
  return (
    <div className="mt-3 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5">
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Lộ trình chuyến đi</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        {tripRouteSteps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.target} className="contents">
              <button
                type="button"
                onClick={() => onNavigate(timelineId, step.target)}
                className={`group flex min-h-[5.5rem] flex-col rounded-xl border bg-gradient-to-br p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-primary)] ${step.accentClass}`}
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 shadow-sm">
                  <Icon className="h-4 w-4 shrink-0" />
                </span>
                <span className="mt-2 text-sm font-bold leading-tight">{step.label}</span>
                <span className="mt-0.5 text-[11px] leading-snug opacity-80">{step.description}</span>
              </button>
              {index < tripRouteSteps.length - 1 ? (
                <div className="hidden items-center justify-center text-slate-300 sm:flex">
                  <ArrowRight className="h-4 w-4" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MyTrip() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  // Initialise from cache so the list appears before any network call.
  const [timelines, setTimelines] = useState<ApiTimelineDetail[]>(
    () => cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE) ?? []
  );
  // Only show a spinner when there's truly nothing cached yet.
  const [loadingTimelines, setLoadingTimelines] = useState(
    () => !cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE)
  );
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(addDaysIso(2));
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const token = getStoredToken();
    if (!token) return;

    // If cache is fresh, don't fetch — the list is already rendered.
    if (!cacheIsStale(TIMELINES_CACHE) && cacheGet(TIMELINES_CACHE)) return;

    let cancelled = false;
    // Only show the full spinner when the list is empty (first load).
    const hasCached = (cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE) ?? []).length > 0;
    if (!hasCached) setLoadingTimelines(true);

    void getMyTimelines(token)
      .then((rows) => {
        if (!cancelled) {
          const list = rows ?? [];
          cacheSet(TIMELINES_CACHE, list, { persistent: true });
          setTimelines(list);
        }
      })
      .catch(() => {
        if (!cancelled && !hasCached) toast.error('Không tải được chuyến đi của bạn');
      })
      .finally(() => {
        if (!cancelled) setLoadingTimelines(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const selectTimeline = (timelineId: string, target: TripRouteTarget) => {
    setLastTripId(timelineId);
    rememberDiscoveryTrip(timelineId);
    if (target === 'discovery') {
      navigate('/');
    } else {
      navigate(`/workspace/${timelineId}`);
    }
  };

  const handleCreate = async () => {
    const token = getStoredToken();
    if (!token) return;
    if (!title.trim() || !startDate || !endDate) {
      toast.error('Vui lòng nhập tên chuyến đi và ngày đi.');
      return;
    }

    setCreating(true);
    try {
      const timeline = await createTimeline(
        {
          title: title.trim(),
          startDate,
          endDate,
          visibility: 'PRIVATE',
        },
        token
      );
      setLastTripId(timeline.id);
      rememberDiscoveryTrip(timeline.id);
      cacheClear(TIMELINES_CACHE);
      toast.success('Đã tạo chuyến đi', { description: 'Bạn có thể kéo địa điểm vào lịch ngay.' });
      navigate('/');
    } catch {
      toast.error('Không thể tạo chuyến đi');
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--vj-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50 px-[var(--vj-page-pad-x)]">
        <Card className="max-w-xl p-8 text-center shadow-xl">
          <Sparkles className="mx-auto h-10 w-10 text-[var(--vj-accent)]" />
          <h1 className="mt-4 text-2xl font-black text-[var(--vj-primary)]">Bắt đầu chuyến đi của bạn</h1>
          <p className="mt-2 text-sm text-slate-600">
            Đăng nhập để tạo timeline, kéo địa điểm từ Khám Phá vào lịch và đồng bộ với nhóm.
          </p>
          <Button asChild className="mt-6 bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]">
            <Link to={`/auth?next=${encodeURIComponent('/mytrip')}`}>Đăng nhập</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const lastTripId = getLastTripId('');

  return (
    <div className="h-full overflow-auto bg-slate-50">
      <div className="mx-auto max-w-[var(--vj-content-max)] px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)]">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-[var(--vj-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--vj-primary)]">
              <Route className="h-3.5 w-3.5" />
              My Trip
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--vj-primary)]">Chuyến đi của tôi</h1>
            <p className="mt-1 text-sm text-slate-600">Chọn một timeline rồi thêm hoạt động từ trang Khám Phá.</p>
          </div>
          {lastTripId ? (
            <Button onClick={() => selectTimeline(lastTripId, 'discovery')} className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]">
              Tiếp tục chuyến gần nhất
            </Button>
          ) : null}
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_22rem] lg:items-start">
          <Card className="p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Timeline hiện có</h2>
            {loadingTimelines ? (
              <div className="mt-6 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải...
              </div>
            ) : timelines.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                Bạn chưa có timeline nào. Tạo chuyến đi mới để bắt đầu kéo địa điểm vào lịch.
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {timelines.map((timeline) => {
                  const isRecent = timeline.id === lastTripId;
                  return (
                    <div
                      key={timeline.id}
                      className={`rounded-2xl border bg-white p-4 shadow-sm transition sm:p-5 ${
                        isRecent ? 'border-[var(--vj-accent)]/40 ring-1 ring-[var(--vj-accent)]/15' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-bold text-[var(--vj-primary)]">{timeline.title}</p>
                            {isRecent ? (
                              <span className="rounded-full bg-[var(--vj-accent)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--vj-accent)]">
                                Gần đây
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">
                            {timeline.startDate} → {timeline.endDate}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="shrink-0 rounded-full bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]"
                          onClick={() => selectTimeline(timeline.id, 'discovery')}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />
                          Thêm hoạt động
                        </Button>
                      </div>
                      <TripScheduleSummary
                        timeline={timeline}
                        onOpenDiscovery={() => selectTimeline(timeline.id, 'discovery')}
                      />
                      <TripRouteNav timelineId={timeline.id} onNavigate={selectTimeline} />
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5 shadow-lg sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Tạo nhanh timeline</h2>
            <p className="mt-1 text-sm text-slate-600">Sau khi tạo, bạn sẽ được đưa tới Khám Phá để thêm hoạt động.</p>
            <div className="mt-4 space-y-3">
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Tên chuyến đi" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
              <Button className="w-full bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]" onClick={handleCreate} disabled={creating}>
                {creating ? 'Đang tạo...' : 'Tạo và thêm hoạt động'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
