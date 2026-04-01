import { useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Clock, GripVertical, MoreHorizontal, Plus, Sparkles, Bike, ChevronDown, Navigation } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, mockTimeline, mockUsers, TimelineItem, Location } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import TimelineBlock from '../components/TimelineBlock';
import { toast } from 'sonner';

export default function Workspace() {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(mockTimeline);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => mockTimeline[0]?.date ?? new Date().toISOString().slice(0, 10));

  const moveTimelineItem = (dragIndex: number, hoverIndex: number) => {
    const dragItem = timelineItems[dragIndex];
    const newItems = [...timelineItems];
    newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, dragItem);
    setTimelineItems(newItems);
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
    setTimelineItems((prev) => [...prev, next]);
    setEditingItem(id);
    toast.success('Đã thêm hoạt động', { description: location.name });
  };

  const addAISuggestion = () => {
    // MVP: insert a reasonable nearby suggestion based on mock data
    const suggestion = mockLocations.find((l) => l.tags.join(' ').includes('Bánh Mì')) ?? mockLocations[0];
    addQuickActivity(suggestion?.id);
  };

  // MVP: accept pending add from Discovery (localStorage bridge)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vj:pendingAdd');
      if (!raw) return;
      localStorage.removeItem('vj:pendingAdd');
      const parsed = JSON.parse(raw) as { locationId?: string; date?: string };
      if (parsed.date) setSelectedDate(parsed.date);
      if (parsed.locationId) {
        setTimeout(() => addQuickActivity(parsed.locationId), 0);
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Calculate time gaps
  const getTimeGap = (index: number) => {
    if (index === visibleTimelineItems.length - 1) return null;
    
    const current = visibleTimelineItems[index];
    const next = visibleTimelineItems[index + 1];
    
    const currentEnd = new Date(`2000-01-01T${current.endTime}`);
    const nextStart = new Date(`2000-01-01T${next.startTime}`);
    
    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / 60000;
    
    return gapMinutes > 0 ? gapMinutes : 0;
  };

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
        <div className="h-full max-w-[1200px] mx-auto w-full p-4 flex gap-4 min-h-0">
          {/* Column 1: Timeline - LỊCH TRÌNH CHUYẾN ĐI */}
          <div className="w-[520px] bg-[var(--vj-primary)] border border-[var(--vj-border)] flex flex-col rounded-2xl overflow-hidden shadow-2xl min-h-0">
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
                    onClick={addAISuggestion}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    GỢI Ý AI
                  </Button>
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
          <ScrollArea className="flex-1 min-h-0 p-4 bg-[#eef2f0]">
            <div className="space-y-3">
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
                    />

                    {/* Transportation Widget */}
                    {index < timelineItems.length - 1 && (
                      <div className="flex items-center gap-2 my-3 ml-14">
                        <div className="flex-1 h-px bg-slate-200" />
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
                          <TransportIcon className="w-3.5 h-3.5 text-[var(--vj-accent)]" />
                          <span className="font-medium">{transport.label}</span>
                          <span className="text-slate-300">•</span>
                          <span>{transport.time}</span>
                        </div>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>
                    )}

                    {/* AI Suggestion for time gaps */}
                    {getTimeGap(index)! > 60 && (
                      <div className="ml-14 my-3">
                        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-slate-900 shadow-sm">
                          <div className="flex items-center gap-2 text-xs font-bold tracking-wide text-slate-700">
                            <Sparkles className="w-4 h-4 text-[var(--vj-accent)]" />
                            GỢI Ý AI
                          </div>
                          <div className="text-sm mt-1 text-slate-700">
                            Ghé tiệm Bánh Mì Bà Phượng gần đó
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
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-[var(--vj-border)] bg-white min-h-0">
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
    </DndProvider>
  );
}
