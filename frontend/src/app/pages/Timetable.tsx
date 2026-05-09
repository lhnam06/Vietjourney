import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarRange } from 'lucide-react';
import { Button } from '../components/ui/button';
import TripTimetable from '../components/TripTimetable';
import { mockLocations, mockTimeline, mockTrips } from '../data/mockData';
import { eachTripDay, layoutsByDate } from '../lib/timetableLayout';
import { loadTripData, setLastTripId } from '../lib/tripStorage';

export default function Timetable() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam ?? 'trip-1';
  const navigate = useNavigate();

  const trip = mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];

  useEffect(() => {
    setLastTripId(tripId);
  }, [tripId]);

  const timelineItems = useMemo(() => {
    const stored = typeof window !== 'undefined' ? loadTripData(tripId) : null;
    return stored?.timeline?.length ? stored.timeline : mockTimeline;
  }, [tripId]);

  const days = useMemo(
    () => eachTripDay(trip.startDate, trip.endDate),
    [trip.startDate, trip.endDate]
  );

  const layoutByDate = useMemo(() => layoutsByDate(timelineItems), [timelineItems]);

  const getLabel = (block: { locationId: string }) =>
    mockLocations.find((l) => l.id === block.locationId)?.name ?? 'Hoạt động';

  return (
    <div className="h-full bg-[var(--vj-bg)] overflow-auto">
      <div className="max-w-[1400px] mx-auto w-full p-4 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Button variant="ghost" size="sm" className="h-8 -ml-2 text-[var(--vj-primary)]" asChild>
                <Link to={`/workspace/${tripId}`}>
                  <ArrowLeft className="size-4 mr-1" />
                  Lịch trình chi tiết
                </Link>
              </Button>
            </div>
            <h1 className="text-2xl font-bold text-[var(--vj-primary)] flex items-center gap-2">
              <CalendarRange className="size-7 text-[var(--vj-accent)] shrink-0" />
              Thời khoá biểu chuyến đi
            </h1>
            <p className="text-sm text-slate-600 mt-1">
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

        {days.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-600">
            Chuyến đi chưa có khoảng ngày hợp lệ.
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
