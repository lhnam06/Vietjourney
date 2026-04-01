import { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Bike,
  ChevronDown,
  Clock,
  GripVertical,
  MoreHorizontal,
  Navigation,
  Plus,
} from 'lucide-react';
import { useParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, mockTimeline, mockUsers, TimelineItem, Location, mockTrips, mockTransactions } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import TimelineBlock from '../components/TimelineBlock';
import { toast } from 'sonner';
import { deleteTimelineItem, loadTripData, setLastTripId, upsertTimelineItem } from '../lib/tripStorage';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button as UIButton } from '../components/ui/button';

export default function Workspace() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam || 'trip-1';
  const trip = mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(() => {
    const stored = typeof window !== 'undefined' ? loadTripData(tripId) : null;
    return stored?.timeline?.length ? stored.timeline : mockTimeline;
  });
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => mockTimeline[0]?.date ?? new Date().toISOString().slice(0, 10));
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [timeEditorId, setTimeEditorId] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');

  useEffect(() => {
    setLastTripId(tripId);
    const stored = loadTripData(tripId);
    if (stored?.timeline?.length) {
      setTimelineItems(stored.timeline);
      setSelectedDate(stored.timeline[0]?.date ?? new Date().toISOString().slice(0, 10));
    } else {
      setTimelineItems(mockTimeline);
      setSelectedDate(mockTimeline[0]?.date ?? new Date().toISOString().slice(0, 10));
    }
  }, [tripId]);

  const moveTimelineItem = (dragIndex: number, hoverIndex: number) => {
    setTimelineItems((prev) => {
      const positions: number[] = [];
      prev.forEach((t, i) => {
        if (t.date === selectedDate) positions.push(i);
      });
      const dayItems = positions.map((i) => prev[i]);
      const dragItem = dayItems[dragIndex];
      if (!dragItem) return prev;
      const reordered = dayItems.slice();
      reordered.splice(dragIndex, 1);
      reordered.splice(hoverIndex, 0, dragItem);
      const next = prev.slice();
      positions.forEach((pos, idx) => {
        next[pos] = reordered[idx]!;
      });
      // persist
      try {
        const stored = loadTripData(tripId);
        if (stored) {
          upsertTimelineItem(tripId, stored.trip, next[0] as any, stored.timeline, stored.transactions);
        }
      } catch {
        // ignore
      }
      return next;
    });
  };

  const addQuickActivity = (locationId?: string) => {
    const location = mockLocations.find((l) => l.id === (locationId ?? mockLocations[0]?.id));
    if (!location) return;

    const last = timelineItems
      .filter((t) => t.date === selectedDate)
      .slice()
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .at(-1);

    const startTime = last ? last.endTime : '09:00';
    const endTime = (() => {
      const dt = new Date(`2000-01-01T${startTime}`);
      dt.setMinutes(dt.getMinutes() + 60);
      return dt.toTimeString().slice(0, 5);
    })();

    const id = `timeline-${Date.now()}`;
    const next: TimelineItem = { id, locationId: location.id, startTime, endTime, date: selectedDate };
    setTimelineItems((prev) => {
      const updated = [...prev, next];
      upsertTimelineItem(tripId, trip, next, mockTimeline, mockTransactions);
      return updated;
    });
    setEditingItem(id);
    toast.success('Đã thêm hoạt động', { description: location.name });
  };

  const dates = useMemo(() => {
    const uniq = Array.from(new Set(timelineItems.map((t) => t.date))).sort();
    return uniq.length ? uniq : [new Date().toISOString().slice(0, 10)];
  }, [timelineItems]);

  useEffect(() => {
    if (!dates.includes(selectedDate)) setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  const visibleTimelineItems = useMemo(
    () => timelineItems.filter((t) => t.date === selectedDate),
    [timelineItems, selectedDate],
  );

  const overlaps = useMemo(() => {
    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };
    const day = visibleTimelineItems.map((t) => ({ id: t.id, s: toMinutes(t.startTime), e: toMinutes(t.endTime) }));
    const overlapping = new Set<string>();
    for (let i = 0; i < day.length; i++) {
      for (let j = i + 1; j < day.length; j++) {
        const a = day[i]!, b = day[j]!;
        if (a.s < b.e && b.s < a.e) {
          overlapping.add(a.id);
          overlapping.add(b.id);
        }
      }
    }
    return overlapping;
  }, [visibleTimelineItems]);

  const openTimeEditor = (id: string) => {
    const item = timelineItems.find((t) => t.id === id);
    if (!item) return;
    setTimeEditorId(id);
    setTimeStart(item.startTime);
    setTimeEnd(item.endTime);
    setTimeEditorOpen(true);
  };

  const saveTimeEditor = () => {
    if (!timeEditorId) return;
    setTimelineItems((prev) => {
      const idx = prev.findIndex((t) => t.id === timeEditorId);
      if (idx < 0) return prev;
      const updated = prev.slice();
      updated[idx] = { ...updated[idx]!, startTime: timeStart, endTime: timeEnd };
      upsertTimelineItem(tripId, trip, updated[idx]!, mockTimeline, mockTransactions);
      return updated;
    });
    setTimeEditorOpen(false);
  };

  // Premium UX: keyboard reordering for selected item (⌘/Ctrl + ↑/↓)
  useEffect(() => {
    if (!editingItem) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();

      const currentIndex = timelineItems.findIndex((t) => t.id === editingItem);
      if (currentIndex === -1) return;

      const nextIndex = e.key === 'ArrowUp' ? currentIndex - 1 : currentIndex + 1;
      if (nextIndex < 0 || nextIndex >= timelineItems.length) return;

      moveTimelineItem(currentIndex, nextIndex);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editingItem, timelineItems]);

  // Get locations from timeline items
  const timelineLocations = visibleTimelineItems
    .map((item) => mockLocations.find((loc) => loc.id === item.locationId))
    .filter((loc): loc is Location => loc !== undefined);

  // Get coordinates for the route
  const routeCoordinates: [number, number][] = visibleTimelineItems.map((item) => {
    const location = mockLocations.find((loc) => loc.id === item.locationId);
    return location ? [location.lat, location.lng] : [0, 0];
  });

  const getTransportMethod = (index: number) => {
    // Alternate between motorbike and walking for Vietnam context
    const methods = [
      { icon: Bike, label: 'Xe Máy', time: '12 phút' },
      { icon: Navigation, label: 'Đi Bộ', time: '8 phút' },
    ];
    return methods[index % 2];
  };

  const onlineUsers = mockUsers.slice(0, 3);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full bg-[var(--vj-bg)]">
        <div className="h-full max-w-[1400px] mx-auto w-full p-4 flex flex-col lg:flex-row gap-4 min-h-0">
          {/* Column 1: Timeline - LỊCH TRÌNH CHUYẾN ĐI */}
          <div className="w-full lg:w-[520px] bg-[var(--vj-primary)] border border-[var(--vj-border)] flex flex-col rounded-2xl overflow-hidden shadow-2xl min-h-0">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 border-b border-[var(--vj-border)] bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)]">
            <div className="p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">LỊCH TRÌNH CHUYẾN ĐI</h2>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 bg-white/10 border-white/20 text-white hover:bg-white/15"
                    onClick={() => toast('Thêm tiện ích', { description: 'MVP: sắp ra mắt.' })}
                  >
                    Thêm tiện ích
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-white/10 border-white/20 text-white hover:bg-white/15"
                    aria-label="More"
                    onClick={() => toast('Tuỳ chọn', { description: 'MVP: sắp ra mắt.' })}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Online Users */}
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {onlineUsers.map((user) => (
                    <Avatar key={user.id} className="w-8 h-8 border-2 border-white ring-2 ring-green-400">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-white/90">{onlineUsers.length} đang hoạt động</span>
              </div>
            </div>

            {/* Day switcher + hints */}
            <div className="px-4 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="inline-flex rounded-xl bg-white/10 border border-white/15 p-1 overflow-hidden">
                  {dates.map((d) => {
                    const isActive = d === selectedDate;
                    const label = new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setSelectedDate(d)}
                        className={`px-3 h-8 rounded-lg text-sm font-semibold transition-colors ${
                          isActive ? 'bg-white text-slate-900' : 'text-white/85 hover:bg-white/10'
                        }`}
                        aria-pressed={isActive}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="h-8 bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white shadow-sm"
                    onClick={() => addQuickActivity()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm hoạt động
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                <span className="inline-flex items-center gap-1.5">
                  <GripVertical className="w-3.5 h-3.5" />
                  Kéo thả để sắp xếp
                </span>
                <span className="inline-flex items-center gap-1.5">
                  ⌘/Ctrl + ↑/↓
                  <span className="text-white/55">để di chuyển mục đã chọn</span>
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Items */}
          <ScrollArea className="flex-1 min-h-0 p-4 bg-[var(--vj-primary)]">
            <div className="space-y-3">
              {visibleTimelineItems.length === 0 && (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white/90">
                  <div className="font-extrabold">Chưa có hoạt động cho ngày này</div>
                  <div className="text-sm text-white/70 mt-1">Bấm “Thêm hoạt động” hoặc thêm từ trang Khám Phá.</div>
                </div>
              )}
              {visibleTimelineItems.map((item, index) => {
                const location = mockLocations.find((loc) => loc.id === item.locationId);
                if (!location) return null;

                const isEditing = editingItem === item.id;
                const transport = getTransportMethod(index);
                const TransportIcon = transport.icon;
                const owner = mockUsers[index % mockUsers.length];
                
                return (
                  <div key={item.id}>
                    <TimelineBlock
                      index={index}
                      item={item}
                      location={location}
                      moveItem={moveTimelineItem}
                      isEditing={isEditing}
                      onEditStart={() => setEditingItem(item.id)}
                      onEditEnd={() => setEditingItem(null)}
                      isLast={index === visibleTimelineItems.length - 1}
                      ownerName={owner?.name?.split(' ').slice(-1)[0]}
                      hasOverlap={overlaps.has(item.id)}
                      onEditTime={() => openTimeEditor(item.id)}
                      onDuplicate={() => {
                        const clone: TimelineItem = { ...item, id: `act-${Date.now()}` };
                        setTimelineItems((prev) => {
                          const updated = [...prev, clone];
                          upsertTimelineItem(tripId, trip, clone, mockTimeline, mockTransactions);
                          return updated;
                        });
                        toast.success('Đã nhân bản hoạt động');
                      }}
                      onRemove={() => {
                        setTimelineItems((prev) => prev.filter((t) => t.id !== item.id));
                        deleteTimelineItem(tripId, trip, item.id, mockTimeline, mockTransactions);
                        toast.success('Đã xoá hoạt động');
                      }}
                    />

                    {/* Transportation Widget */}
                    {index < visibleTimelineItems.length - 1 && (
                      <div className="flex items-center justify-center gap-3 my-3 ml-14">
                        <div className="flex items-center gap-2 text-xs text-white/90 bg-white/10 px-4 py-2 rounded-2xl border border-white/15 shadow-sm">
                          <TransportIcon className="w-4 h-4 text-white/90" />
                          <div className="leading-tight">
                            <div className="font-extrabold">{transport.label}</div>
                            <div className="text-white/70 tabular-nums">{transport.time}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Add Activity Button */}
          <div className="p-4 border-t border-white/10 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)]">
            <Button className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium">
              + Thêm Hoạt Động
            </Button>
          </div>
          </div>

          {/* Column 2: Map */}
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-[var(--vj-border)] bg-white min-h-[360px] lg:min-h-0">
          {/* Panel title like reference */}
          <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-slate-200">
            <h2 className="text-sm font-bold text-[#0b5d55]">BẢN ĐỒ LỘ TRÌNH</h2>
          </div>
          <div className="absolute top-16 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-slate-200">
            <h3 className="font-bold text-sm text-[#0A4A6E] mb-2">Lộ Trình Tự Động</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>7.5 giờ</span>
              </div>
              <div className="w-px h-4 bg-slate-300" />
              <div className="flex items-center gap-1">
                <span className="font-semibold text-[#FF6B35]">Mức Độ Đông Đúc:</span>
                <span className="text-amber-600 font-medium">Trung Bình</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200">
            <p className="text-xs font-semibold text-[#0A4A6E]">🗺️ Hà Nội, Việt Nam</p>
          </div>

          <SimpleMap
            locations={timelineLocations}
            showRoute={true}
            routeCoordinates={routeCoordinates}
          />
        </div>
        </div>
      </div>

      <Dialog open={timeEditorOpen} onOpenChange={setTimeEditorOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thời gian</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Input type="time" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} />
            <Input type="time" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} />
          </div>
          {overlaps.size > 0 && (
            <div className="text-xs text-rose-600 font-semibold mt-2">
              Có hoạt động bị chồng giờ. Vui lòng điều chỉnh để tránh trùng lịch.
            </div>
          )}
          <DialogFooter>
            <UIButton variant="outline" onClick={() => setTimeEditorOpen(false)}>
              Huỷ
            </UIButton>
            <UIButton className="bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white" onClick={saveTimeEditor}>
              Lưu
            </UIButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
