import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Move,
  Plus,
  Trash2,
  ChevronDown,
  GripVertical,
  MessageSquare,
  Sparkles, // Import Sparkles icon for AI Planner button
} from 'lucide-react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { createDefaultTrip, LEGACY_DEMO_TRIP_ID, type Location, type TimelineItem } from '../types/domain';
import { toast } from 'sonner';
import { getSavedPlaces } from '../lib/savedPlaces';
import { useAuth } from '../context/AuthContext';
import { 
  getTimelineDetail, 
  mapApiTimelineToTimetable, 
  addTimelineEvent, 
  deleteTimelineEvent, 
  moveTimelineEvent, 
} from '../lib/timelineApi';
import { chunkTripDatesByCalendarWeek } from '../lib/timetableLayout';
import { ChatPanel } from '../components/ChatPanel'; // Import ChatPanel component
import { AgentPanel } from '../components/AgentPanel'; // Import AgentPanel component

const TIMETABLE_DAY_START_HOUR = 6;
const TIMETABLE_DAY_END_HOUR = 23;
const PX_PER_HOUR = 80; 

const TIMETABLE_EDGE_ZONE_PX = 50;
const TIMETABLE_LEFT_PILL_GUTTER_PX = 32;
const EDGE_HOLD_MS = 500;

function getTimetableLabel(block: any) {
  if (block.title) return block.title;
  return block.category === 'food' ? 'Ăn uống' : block.category === 'lodging' ? 'Lưu trú' : 'Hoạt động';
}

function WeekEdgePill({
  side,
  visible,
  holding,
  holdKey,
  holdMs,
}: {
  side: 'left' | 'right';
  visible: boolean;
  holding: boolean;
  holdMs: number;
  holdKey: number;
}) {
  const isLeft = side === 'left';
  const Icon = isLeft ? ChevronLeft : ChevronRight;

  return (
    <div
      className={`vj-week-pill pointer-events-none absolute top-1/2 z-40 ${isLeft ? 'left-0.5' : 'right-0.5'} ${visible ? 'vj-week-pill-visible' : 'opacity-0'}`}
      aria-hidden={!visible}
    >
      <div
        className={`relative flex min-h-[8.5rem] w-7 flex-col items-center justify-center gap-1.5 overflow-hidden rounded-full py-4 shadow-[0_4px_14px_rgba(15,23,42,0.18)] ${isLeft ? 'bg-[var(--vj-primary)] text-white' : 'bg-[var(--vj-accent)] text-white'
          } ${holding ? 'ring-2 ring-white/50 shadow-[0_6px_20px_rgba(15,23,42,0.22)]' : ''}`}
      >
        {holding ? (
          <div
            key={holdKey}
            className="vj-week-pill-fill absolute inset-x-0 bottom-0 bg-white/25"
            style={{ animationDuration: `${holdMs}ms` }}
          />
        ) : null}
        <Icon
          className={`relative z-10 h-3.5 w-3.5 shrink-0 ${holding ? (isLeft ? 'vj-edge-chevron-left' : 'vj-edge-chevron-right') : ''}`}
          strokeWidth={2.5}
        />
        <div className="relative z-10 flex flex-col items-center gap-px text-[7px] font-bold uppercase leading-none tracking-[0.14em]">
          <span>{isLeft ? 'PREV' : 'NEXT'}</span>
          <span>WEEK</span>
        </div>
      </div>
    </div>
  );
}

export default function Planner() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam || LEGACY_DEMO_TRIP_ID;
  const navigate = useNavigate();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  
  // Asset Sidebar State
  const [savedPlaces, setSavedPlaces] = useState<Location[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Timetable State
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [tripMetadata, setTripMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [draggedLocationId, setDraggedLocationId] = useState<string | null>(null);
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [deleteZoneActive, setDeleteZoneActive] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState<any>(null);
  
  const [dropPreview, setDropPreview] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    topPct: number;
  } | null>(null);

  const [edgeNavHint, setEdgeNavHint] = useState<'prev' | 'next' | null>(null);
  const [edgeHoldKey, setEdgeHoldKey] = useState(0);
  const edgeNavTimerRef = useRef<NodeJS.Timeout | null>(null);
  const edgeNavDirectionRef = useRef<'prev' | 'next' | null>(null);

  const timetableScrollRef = useRef<HTMLDivElement>(null);
  const timetablePanelRef = useRef<HTMLDivElement>(null);

  const [isChatOpen, setIsChatOpen] = useState(false); // State for chat panel visibility
  const [isAgentOpen, setIsAgentOpen] = useState(false); // State for AI agent panel visibility

  // Fetch Saved Places
  useEffect(() => {
    if (tripId) {
      setSavedPlaces(getSavedPlaces(tripId));
    } else {
      setSavedPlaces(getSavedPlaces());
    }
  }, [tripId]);

  const filteredSavedPlaces = useMemo(() => {
    if (!searchQuery.trim()) return savedPlaces;
    const query = searchQuery.toLowerCase();
    return savedPlaces.filter(p => p.name.toLowerCase().includes(query) || p.description.toLowerCase().includes(query));
  }, [savedPlaces, searchQuery]);

  const isOwner = useMemo(() => {
    if (!user || !tripMetadata) return false;
    return user.id === tripMetadata.ownerId;
  }, [user, tripMetadata]);

  const fetchTimeline = useCallback(async () => {
    if (authLoading) return;
    if (!token || tripId === LEGACY_DEMO_TRIP_ID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const detail = await getTimelineDetail(tripId, token);
      if (detail) {
        const { items, tripMeta, placesByLocationId, labelByLocationId } = mapApiTimelineToTimetable(detail);
        setTimelineItems(items || []);
        setTripMetadata({ ...tripMeta, placesByLocationId, labelByLocationId });
      }
    } catch (error) {
      console.error('Failed to fetch timeline:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, token, authLoading]);

  useEffect(() => {
    fetchTimeline();
  }, [fetchTimeline]);

  const trip = useMemo(() => {
    if (tripMetadata) return tripMetadata;
    return createDefaultTrip(tripId);
  }, [tripMetadata, tripId]);

  const tripDays = useMemo(() => {
    const start = new Date(trip.startDate + 'T12:00:00Z');
    const end = new Date(trip.endDate + 'T12:00:00Z');
    const days: string[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().slice(0, 10));
    }
    return days.length > 0 ? days : [new Date().toISOString().slice(0, 10)];
  }, [trip]);

  // Pagination Logic
  const tripWeekChunks = useMemo(() => chunkTripDatesByCalendarWeek(tripDays), [tripDays]);
  const [weekPageIndex, setWeekPageIndex] = useState(0);

  useEffect(() => {
    setWeekPageIndex((prev) => {
      const maxPage = Math.max(0, tripWeekChunks.length - 1);
      return prev > maxPage ? maxPage : prev;
    });
  }, [tripWeekChunks]);

  const maxWeekPage = Math.max(0, tripWeekChunks.length - 1);
  const visibleDates = useMemo(() => {
    return tripWeekChunks[weekPageIndex] ?? tripWeekChunks[0] ?? [];
  }, [tripWeekChunks, weekPageIndex]);

  const weekNumber = weekPageIndex + 1;
  const totalWeeks = Math.max(1, tripWeekChunks.length);
  const currentWeekLabel = useMemo(() => {
    if (!visibleDates.length) return '';
    const start = new Date(visibleDates[0] + 'T12:00:00Z');
    const end = new Date(visibleDates[visibleDates.length - 1] + 'T12:00:00Z');
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`;
  }, [visibleDates]);

  // Timetable Layout Calculations
  const daySpanMinutes = (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * 60;
  
  const timetableLayouts = useMemo(() => {
    const layouts = new Map<string, any[]>();
    tripDays.forEach((d) => layouts.set(d, []));

    const toMinutes = (t: string) => {
      const [hh, mm] = t.split(':').map(Number);
      return (hh || 0) * 60 + (mm || 0);
    };

    timelineItems.forEach((item) => {
      if (!item.date || !layouts.has(item.date)) return;

      const sMins = toMinutes(item.startTime);
      const eMins = toMinutes(item.endTime);
      const gridStartMins = TIMETABLE_DAY_START_HOUR * 60;
      
      let duration = eMins - sMins;
      if (duration < 30) duration = 30; // Min 30m block
      
      const topPct = Math.max(0, Math.min(100, ((sMins - gridStartMins) / daySpanMinutes) * 100));
      const heightPct = Math.min(100 - topPct, (duration / daySpanMinutes) * 100);

      layouts.get(item.date)!.push({
        ...item,
        topPct,
        heightPct,
        leftPct: 0,
        widthPct: 100,
        sMins,
        eMins
      });
    });

    // Basic overlap handling (visual)
    for (const [date, blocks] of layouts.entries()) {
      blocks.sort((a, b) => a.sMins - b.sMins);
      for (let i = 0; i < blocks.length; i++) {
        const b1 = blocks[i];
        let overlapCount = 0;
        for (let j = 0; j < i; j++) {
          const b2 = blocks[j];
          if (b1.sMins < b2.eMins && b2.sMins < b1.eMins) overlapCount++;
        }
        b1.leftPct = (overlapCount % 3) * 5; 
        b1.widthPct = 100 - b1.leftPct;
      }
    }

    return layouts;
  }, [timelineItems, tripDays, daySpanMinutes]);

  // Drag and Drop Helpers
  const calculateDropTime = useCallback((e: React.DragEvent) => {
    const rect = timetablePanelRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const y = e.clientY - rect.top;
    const clickPct = y / rect.height;
    const dropMinutesRaw = TIMETABLE_DAY_START_HOUR * 60 + clickPct * daySpanMinutes;
    const roundedMins = Math.floor(dropMinutesRaw / 15) * 15;
    
    if (roundedMins < TIMETABLE_DAY_START_HOUR * 60) return null;
    if (roundedMins > (TIMETABLE_DAY_END_HOUR - 1) * 60) return null;

    const endMins = roundedMins + 120; // Default 2 hours duration
    const sHH = String(Math.floor(roundedMins / 60)).padStart(2, '0');
    const sMM = String(roundedMins % 60).padStart(2, '0');
    const eHH = String(Math.floor(endMins / 60)).padStart(2, '0');
    const eMM = String(endMins % 60).padStart(2, '0');
    
    return {
      start: `${sHH}:${sMM}`,
      end: `${eHH}:${eMM}`,
      topPct: ((roundedMins - TIMETABLE_DAY_START_HOUR * 60) / daySpanMinutes) * 100
    };
  }, [daySpanMinutes]);

  const calculateDropDate = useCallback((e: React.DragEvent) => {
    const rect = timetablePanelRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left - 56; // 3.5rem axis
    if (x < 0) return null;
    
    const colWidth = (rect.width - 56) / visibleDates.length;
    const colIndex = Math.floor(x / colWidth);
    
    return visibleDates[colIndex] || null;
  }, [visibleDates]);

  const clearEdgeNavTimer = useCallback(() => {
    if (edgeNavTimerRef.current) {
      clearTimeout(edgeNavTimerRef.current);
      edgeNavTimerRef.current = null;
    }
    edgeNavDirectionRef.current = null;
    setEdgeNavHint(null);
  }, []);

  useEffect(() => () => clearEdgeNavTimer(), [clearEdgeNavTimer]);

  const isDraggingToTimetable = Boolean(draggedLocationId) || Boolean(draggedEventId);

  const scheduleEdgeWeekNav = useCallback(
    (clientX: number, container: HTMLElement) => {
      if (!isDraggingToTimetable) return;

      const rect = container.getBoundingClientRect();
      let direction: 'prev' | 'next' | null = null;

      if (clientX >= rect.right - TIMETABLE_EDGE_ZONE_PX && weekPageIndex < maxWeekPage) {
        direction = 'next';
      } else if (clientX <= rect.left + TIMETABLE_EDGE_ZONE_PX && weekPageIndex > 0) {
        direction = 'prev';
      }

      if (!direction) {
        clearEdgeNavTimer();
        return;
      }

      setEdgeNavHint(direction);

      if (edgeNavTimerRef.current && edgeNavDirectionRef.current === direction) return;

      if (edgeNavTimerRef.current) {
        clearTimeout(edgeNavTimerRef.current);
        edgeNavTimerRef.current = null;
      }

      edgeNavDirectionRef.current = direction;
      setEdgeHoldKey((key) => key + 1);
      edgeNavTimerRef.current = setTimeout(() => {
        setWeekPageIndex((prev) => (direction === 'next' ? prev + 1 : prev - 1));
        edgeNavTimerRef.current = null;
        edgeNavDirectionRef.current = null;
        setEdgeNavHint(null);
      }, EDGE_HOLD_MS);
    },
    [isDraggingToTimetable, weekPageIndex, maxWeekPage, clearEdgeNavTimer]
  );

  const handleTimetableScrollDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = draggedEventId ? 'move' : 'copy';
      if (timetableScrollRef.current) {
        scheduleEdgeWeekNav(event.clientX, timetableScrollRef.current);
      }
    },
    [draggedEventId, scheduleEdgeWeekNav]
  );

  const handleDragStartSidebar = (loc: Location, e: React.DragEvent) => {
    setDraggedLocationId(loc.id);
    e.dataTransfer.setData('location_id', loc.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDropToTimetable = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropPreview(null);
    setDeleteZoneActive(false);
    clearEdgeNavTimer();

    const targetDate = calculateDropDate(e);
    const targetTime = calculateDropTime(e);
    
    if (!targetDate || !targetTime) return;

    if (draggedEventId) {
       // Move existing event
       const eventId = draggedEventId;
       setDraggedEventId(null);
       
       if (deleteZoneActive && token && isOwner) {
         await deleteTimelineEvent(tripId, eventId, token);
         toast.success('Đã xóa hoạt động');
         fetchTimeline();
         return;
       }

       if (token && isOwner) {
         await moveTimelineEvent(
           tripId, 
           eventId, 
           `${targetDate}T${targetTime.start}:00`, 
           `${targetDate}T${targetTime.end}:00`, 
           token
         );
         fetchTimeline();
       } else {
         toast.error('Chỉ trưởng nhóm mới được sửa');
       }
       return;
    }

    if (draggedLocationId) {
      // Add new event
      const locId = draggedLocationId;
      setDraggedLocationId(null);
      const loc = savedPlaces.find(p => p.id === locId);
      if (!loc || !token || !isOwner) return;

      try {
        await addTimelineEvent(tripId, {
          externalPlaceId: loc.id,
          category: 'ACTIVITY', // Simplification for now
          startTime: `${targetDate}T${targetTime.start}:00`,
          endTime: `${targetDate}T${targetTime.end}:00`,
          notes: '',
          orderIndex: 0,
          status: 'PLANNED'
        }, token);
        toast.success('Đã thêm vào lịch trình');
        fetchTimeline();
      } catch (err) {
        toast.error('Không thể thêm hoạt động');
      }
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full min-h-0 bg-slate-50">
        {/* LEFT: Asset Sidebar */}
        <div className="w-80 border-r border-slate-200 bg-white shadow-sm flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-800">Kho Địa Điểm</h2>
            <p className="text-xs text-slate-500 mb-3">Kéo các địa điểm đã lưu vào lịch trình bên phải</p>
            <input 
              type="text" 
              placeholder="Tìm địa điểm đã lưu..." 
              className="w-full px-3 py-2 bg-slate-100 rounded-lg text-sm border-0 focus:ring-2 focus:ring-[#f97316]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ScrollArea className="flex-1 p-3">
            <div className="flex flex-col gap-3">
              {filteredSavedPlaces.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-sm">
                  Chưa có địa điểm nào được lưu cho chuyến đi này.<br/>Hãy sang trang Khám phá để lưu địa điểm nhé.
                </div>
              ) : (
                filteredSavedPlaces.map(loc => (
                  <div 
                    key={loc.id}
                    draggable
                    onDragStart={(e) => handleDragStartSidebar(loc, e)}
                    onDragEnd={() => setDraggedLocationId(null)}
                    className="flex items-center gap-3 p-2 border border-slate-200 rounded-xl bg-white cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group"
                  >
                    <img src={loc.image} alt={loc.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{loc.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-1">{loc.description}</p>
                    </div>
                    <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT: Timetable */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#fafafa]">
          {/* Header */}
          <div className={`border-b border-slate-200/90 px-6 py-4 transition-colors z-10 ${draggedLocationId || draggedEventId ? 'bg-gradient-to-r from-orange-50/90 via-white to-emerald-50/80' : 'bg-gradient-to-br from-white to-slate-50/80'}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-2">
                  <Link to="/planner/select" className="hover:text-[var(--vj-primary)] hover:underline transition-colors">Lên lịch trình</Link>
                  <span>/</span>
                  <span className="text-[var(--vj-primary)]">{trip?.title || trip?.name || 'Chuyến đi'}</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-[var(--vj-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--vj-primary)]">
                  <CalendarRange className="h-3.5 w-3.5" />
                  {draggedEventId ? 'Đang di chuyển' : draggedLocationId ? 'Sẵn sàng thả' : 'Lịch trình'}
                </div>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--vj-primary)]">
                  {draggedEventId
                    ? 'Đang đổi ngày / giờ hoạt động'
                    : draggedLocationId
                      ? 'Đang kéo địa điểm...'
                      : 'Bảng Thời Gian'}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {dropPreview
                    ? `Thả để lên lịch ${dropPreview.startTime} - ${dropPreview.endTime} ngày ${dropPreview.date}.`
                    : 'Kéo địa điểm từ danh sách bên trái vào khung giờ. Kéo thẻ đã có trong lịch để đổi sang ngày hoặc giờ khác.'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/workspace/${tripId}`)}>
                    Quay lại Bàn làm việc
                  </Button>
                  <Button variant="outline" onClick={() => setIsChatOpen(true)}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Trò chuyện
                  </Button>
                  <Button variant="outline" onClick={() => setIsAgentOpen(true)} className="bg-gradient-to-r from-[var(--vj-primary)]/10 to-[var(--vj-accent)]/10 border-[var(--vj-accent)]/30 hover:from-[var(--vj-primary)]/20 hover:to-[var(--vj-accent)]/20">
                    <Sparkles className="w-4 h-4 mr-2 text-[var(--vj-accent)]" />
                    <span className="font-semibold">AI Planner</span>
                  </Button>
                </div>
                <div className={`rounded-2xl border px-4 py-3 text-xs max-w-xs transition-colors ${draggedLocationId
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-orange-200 bg-orange-50 text-orange-900'
                  }`}>
                  <p className="font-bold">{draggedLocationId ? 'Thả vào cột ngày' : 'Mẹo nhanh'}</p>
                  <p className="mt-1">
                    {draggedLocationId
                      ? 'Đường màu cam cho biết khung giờ sẽ được điền.'
                      : 'Sau khi thả, hộp lên lịch sẽ mở sẵn ngày và giờ để bạn kiểm tra trước khi lưu.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {tripWeekChunks.length > 1 ? (
                <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-r from-slate-50 to-white p-2 shadow-sm">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      Tuần {weekNumber}/{totalWeeks}
                    </span>
                    <span className="text-xs font-semibold text-[var(--vj-primary)]">{currentWeekLabel}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={weekPageIndex === 0}
                      onClick={() => setWeekPageIndex(Math.max(0, weekPageIndex - 1))}
                      className="h-9 shrink-0 rounded-xl px-2 text-slate-600 hover:bg-[var(--vj-primary)]/10 hover:text-[var(--vj-primary)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Tuần trước</span>
                    </Button>
                    <div className="flex flex-1 gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {visibleDates.map((date) => (
                        <div
                          key={date}
                          className="flex-1 min-w-0 rounded-xl border border-[var(--vj-primary)]/15 bg-gradient-to-br from-[var(--vj-primary)] to-[var(--vj-primary-2)] px-2.5 py-1.5 text-center shadow-sm"
                        >
                          <span className="block text-[10px] font-semibold uppercase text-white/70 truncate">
                            {new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', { weekday: 'short' })}
                          </span>
                          <span className="block text-xs font-bold tabular-nums text-white">
                            {new Date(`${date}T12:00:00Z`).getDate()}/{new Date(`${date}T12:00:00Z`).getMonth() + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={weekPageIndex >= maxWeekPage}
                      onClick={() => setWeekPageIndex(Math.min(maxWeekPage, weekPageIndex + 1))}
                      className="h-9 shrink-0 rounded-xl px-2 text-slate-600 hover:bg-[var(--vj-primary)]/10 hover:text-[var(--vj-primary)]"
                    >
                      <span className="hidden sm:inline">Tuần sau</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {visibleDates.map((date) => (
                    <div
                      key={date}
                      className="rounded-full border border-[var(--vj-primary)]/20 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)] px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                    >
                      {new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', { weekday: 'short' })} {new Date(`${date}T12:00:00Z`).getDate()}/{new Date(`${date}T12:00:00Z`).getMonth() + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grid Area */}
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative min-h-0 flex-1">
              {isDraggingToTimetable && tripWeekChunks.length > 1 && weekPageIndex > 0 ? (
                <WeekEdgePill
                  side="left"
                  visible={edgeNavHint === 'prev'}
                  holding={edgeNavHint === 'prev'}
                  holdKey={edgeHoldKey}
                  holdMs={EDGE_HOLD_MS}
                />
              ) : null}
              {isDraggingToTimetable && tripWeekChunks.length > 1 && weekPageIndex < maxWeekPage ? (
                <WeekEdgePill
                  side="right"
                  visible={edgeNavHint === 'next'}
                  holding={edgeNavHint === 'next'}
                  holdKey={edgeHoldKey}
                  holdMs={EDGE_HOLD_MS}
                />
              ) : null}

              <div 
                className="h-full overflow-auto relative transition-[padding] duration-300 ease-out"
                ref={timetableScrollRef}
                style={{
                  paddingLeft:
                    isDraggingToTimetable && tripWeekChunks.length > 1 && weekPageIndex > 0
                      ? TIMETABLE_LEFT_PILL_GUTTER_PX
                      : undefined,
                }}
                onDragOver={handleTimetableScrollDragOver}
                onDragLeave={(event) => {
                  const next = event.relatedTarget as Node | null;
                  if (next && timetableScrollRef.current?.contains(next)) return;
                  clearEdgeNavTimer();
                }}
              >
                 <div 
                   ref={timetablePanelRef}
                   className="min-h-full min-w-[800px] bg-white m-4 rounded-xl shadow-sm border border-slate-200 overflow-hidden"
                   onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = draggedEventId ? 'move' : 'copy';
                      if (draggedLocationId || draggedEventId) {
                        const targetDate = calculateDropDate(e);
                        const targetTime = calculateDropTime(e);
                        if (targetDate && targetTime) {
                          setDropPreview({
                            date: targetDate,
                            startTime: targetTime.start,
                            endTime: targetTime.end,
                            topPct: targetTime.topPct,
                          });
                        }
                      }
                   }}
                   onDragLeave={() => { setDropPreview(null); setDeleteZoneActive(false); }}
                   onDrop={handleDropToTimetable}
                 >
                  <div className="flex bg-slate-50 border-b border-slate-200 text-center py-2 font-bold text-sm text-slate-600 pl-[3.5rem] hidden">
                    {visibleDates.map(d => (
                      <div key={d} className="flex-1 border-r border-slate-200 last:border-0">{d}</div>
                    ))}
                  </div>

                <div 
                  className="relative grid grid-cols-[3.5rem_minmax(0,1fr)]"
                  style={{ height: `${daySpanMinutes * (PX_PER_HOUR / 60)}px` }}
                >
                  {/* Axis */}
                  <div className="relative border-r border-slate-200/90 bg-white z-10 w-[3.5rem] shrink-0">
                    <div className="sticky top-0 z-30 flex h-12 items-end justify-center border-b border-slate-200 bg-slate-100/90 pb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giờ</span>
                    </div>
                    <div className="relative" style={{ height: `${daySpanMinutes * (PX_PER_HOUR / 60)}px` }}>
                      {Array.from({ length: TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR + 1 }).map((_, i) => (
                        <div
                          key={i}
                          className="absolute w-full border-t border-slate-200/90 pr-2 text-right text-xs font-medium tabular-nums text-slate-500"
                          style={{ top: `${i * PX_PER_HOUR}px`, height: `${PX_PER_HOUR}px` }}
                        >
                          <span className="inline-block translate-y-[-0.35rem]">{String(TIMETABLE_DAY_START_HOUR + i).padStart(2, '0')}:00</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Columns */}
                  <div className="relative flex min-w-0 flex-1">
                    {Array.from({ length: TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR + 1 }).map((_, i) => (
                      <div
                        key={i}
                        className="pointer-events-none absolute left-0 right-0 border-b border-slate-100"
                        style={{ top: `${i * PX_PER_HOUR}px` }}
                      />
                    ))}

                    {visibleDates.map((dateStr) => {
                      const blocks = timetableLayouts.get(dateStr) || [];
                      const isPreviewDate = dropPreview?.date === dateStr;
                      return (
                        <div key={dateStr} className={`relative flex-1 border-r last:border-r-0 min-w-0 transition-colors ${isPreviewDate ? 'border-r-orange-200/80 bg-orange-50/40' : 'border-slate-200/80 bg-white'}`}>
                          <div className={`sticky top-0 z-10 flex h-12 flex-col justify-center border-b px-3 transition-colors ${isPreviewDate ? 'border-orange-200 bg-gradient-to-br from-orange-100 to-orange-50' : 'border-slate-200 bg-gradient-to-br from-[color-mix(in_oklab,var(--vj-primary)_10%,white)] to-white'}`}>
                            <span className="text-xs font-extrabold capitalize leading-tight text-[var(--vj-primary)]">
                              {dateStr}
                            </span>
                            <span className="text-[10px] tabular-nums text-slate-500">
                              {isPreviewDate ? `${dropPreview.startTime} - ${dropPreview.endTime}` : ''}
                            </span>
                          </div>
                          <div className="relative" style={{ height: `${daySpanMinutes * (PX_PER_HOUR / 60)}px` }}>
                            {blocks.map((block) => (
                              <button
                                key={block.id}
                                type="button"
                                draggable
                                onDragStart={(e) => {
                                  setDraggedEventId(block.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => setDraggedEventId(null)}
                                onClick={() => {
                                  let placeDetails = null;
                                  // Look up place details from tripMetadata
                                  if (tripMetadata?.placesByLocationId) {
                                    const cleanId = block.locationId.includes(':') ? block.locationId.split(':').pop() : block.locationId;
                                    placeDetails = tripMetadata.placesByLocationId[cleanId] || tripMetadata.placesByLocationId[block.locationId];
                                  }
                                  
                                  setSelectedEventDetails({
                                    ...block,
                                    placeDetails
                                  });
                                }}
                                className={`group/event absolute cursor-grab overflow-hidden rounded-xl border bg-white px-2 py-1.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition active:cursor-grabbing hover:-translate-y-px hover:border-[var(--vj-accent)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-accent)] ${draggedEventId === block.id ? 'border-[var(--vj-accent)] opacity-50 ring-2 ring-[var(--vj-accent)]/30' : 'border-[var(--vj-accent)]/25'}`}
                                style={{
                                  top: `${block.topPct}%`,
                                  height: `calc(${block.heightPct}% - 2px)`,
                                  width: `calc(${block.widthPct}% - 4px)`,
                                  left: `calc(${block.leftPct}% + 2px)`,
                                }}
                              >
                                <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--vj-accent)]" aria-hidden />
                                <span className="block pl-2 text-[11px] font-extrabold leading-snug text-slate-900 line-clamp-2">
                                  {(() => {
                                    const cleanId = block.locationId.includes(':') ? block.locationId.split(':').pop() : block.locationId;
                                    return tripMetadata?.labelByLocationId?.[block.locationId] || tripMetadata?.labelByLocationId?.[cleanId] || getTimetableLabel(block);
                                  })()}
                                </span>
                                <span className="mt-0.5 flex items-center gap-1 pl-2 text-[10px] font-medium tabular-nums text-slate-600">
                                  <Clock className="h-3 w-3 shrink-0 text-[var(--vj-accent)]" />
                                  {block.startTime}
                                </span>
                              </button>
                            ))}
                            
                            {blocks.length === 0 ? (
                              <div className={`vj-animate-in pointer-events-none absolute inset-x-3 top-6 flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-3 py-5 text-center transition-all duration-300 ${draggedLocationId || draggedEventId
                                  ? 'border-emerald-400 bg-emerald-50/90 shadow-[0_0_0_4px_rgba(16,185,129,0.08)]'
                                  : 'border-slate-200 bg-white/60'
                                }`}>
                                <span className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${draggedLocationId || draggedEventId ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                                  }`}>
                                  {draggedLocationId || draggedEventId ? <Plus className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />}
                                </span>
                                <span className={`text-xs font-bold ${draggedLocationId || draggedEventId ? 'text-emerald-800' : 'text-slate-600'}`}>
                                  {draggedLocationId || draggedEventId ? 'Thả vào đây' : 'Chưa có hoạt động'}
                                </span>
                                <span className={`text-[10px] leading-snug ${draggedLocationId || draggedEventId ? 'text-emerald-700/80' : 'text-slate-400'}`}>
                                  {draggedLocationId || draggedEventId ? 'Nhả chuột để đặt vào khung giờ' : 'Kéo địa điểm từ danh sách bên trái'}
                                </span>
                              </div>
                            ) : null}

                            {dropPreview?.date === dateStr && (
                              <div
                                className="vj-drop-preview pointer-events-none absolute left-2 right-2 z-20"
                                style={{ top: `${dropPreview.topPct}%` }}
                              >
                                <div className="flex -translate-y-1/2 items-center gap-2">
                                  <span className="rounded-full bg-[var(--vj-accent)] px-2 py-1 text-[10px] font-black tabular-nums text-white shadow-lg">
                                    {dropPreview.startTime} - {dropPreview.endTime}
                                  </span>
                                  <span className="h-0.5 flex-1 rounded-full bg-[var(--vj-accent)] shadow-[0_0_0_3px_rgba(255,107,53,0.15)]" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

             </div>
            </div>
           </div>
          </div>
        </div>

        {/* Delete Strip */}
        {draggedEventId ? (
          <div
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDeleteZoneActive(true); }}
            onDragLeave={() => setDeleteZoneActive(false)}
            onDrop={async (e) => {
               e.preventDefault();
               setDeleteZoneActive(false);
               const eventId = draggedEventId;
               setDraggedEventId(null);
               if (eventId && token && isOwner) {
                 await deleteTimelineEvent(tripId, eventId, token);
                 toast.success('Đã xóa hoạt động khỏi lịch');
                 fetchTimeline();
               }
            }}
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 vj-slide-up shrink-0 border-t-2 border-dashed px-8 py-4 text-center transition-all duration-200 rounded-xl shadow-2xl ${deleteZoneActive
                ? 'scale-[1.01] border-red-500 bg-red-100 vj-pulse-accent'
                : 'border-red-300/70 bg-gradient-to-r from-red-50 via-orange-50/80 to-red-50'
              }`}
          >
            <div className="flex items-center justify-center gap-3">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${deleteZoneActive ? 'bg-red-500 text-white' : 'bg-red-100 text-red-500'}`}>
                <Trash2 className="h-4 w-4" />
              </span>
              <span className={`text-sm font-bold ${deleteZoneActive ? 'text-red-800' : 'text-red-600/90'}`}>
                {deleteZoneActive ? 'Thả để xóa khỏi lịch' : 'Kéo hoạt động vào đây để xóa'}
              </span>
            </div>
          </div>
        ) : null}

        {/* Event Details Dialog */}
        <Dialog open={!!selectedEventDetails} onOpenChange={(open) => !open && setSelectedEventDetails(null)}>
          <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-3xl shadow-2xl">
            {selectedEventDetails && (
              <div className="flex flex-col">
                {selectedEventDetails.placeDetails?.imageUrl ? (
                  <div className="relative h-48 w-full bg-slate-100">
                    <img 
                      src={selectedEventDetails.placeDetails.imageUrl} 
                      alt={selectedEventDetails.placeDetails.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <Badge variant="outline" className="mb-2 bg-white/20 backdrop-blur-md text-white border-white/30">
                        {selectedEventDetails.category === 'food' ? 'Ăn uống' : selectedEventDetails.category === 'lodging' ? 'Lưu trú' : 'Hoạt động'}
                      </Badge>
                      <h2 className="text-xl font-black text-white line-clamp-2">
                        {selectedEventDetails.placeDetails.name}
                      </h2>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-[var(--vj-primary)]/10 via-emerald-50 to-white p-6 pb-4 border-b border-slate-100">
                    <Badge variant="outline" className="mb-2 bg-white shadow-sm border-slate-200">
                      {selectedEventDetails.category === 'food' ? 'Ăn uống' : selectedEventDetails.category === 'lodging' ? 'Lưu trú' : 'Hoạt động'}
                    </Badge>
                    <h2 className="text-xl font-black text-slate-800 line-clamp-2">
                      {selectedEventDetails.placeDetails?.name || selectedEventDetails.title || 'Địa điểm'}
                    </h2>
                  </div>
                )}
                
                <div className="p-6 bg-white space-y-4">
                  <div className="flex items-center gap-3 text-sm text-slate-600 font-medium p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <Clock className="w-5 h-5 text-[var(--vj-accent)] shrink-0" />
                    <div>
                      <div className="text-xs text-slate-400">Khung giờ lên lịch</div>
                      <div className="text-slate-800 font-bold">{selectedEventDetails.startTime} - {selectedEventDetails.endTime}</div>
                    </div>
                  </div>
                  
                  {selectedEventDetails.placeDetails?.address && (
                    <div className="flex items-start gap-3 text-sm text-slate-600 font-medium">
                      <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{selectedEventDetails.placeDetails.address}</span>
                    </div>
                  )}
                  
                  {selectedEventDetails.placeDetails?.description && (
                    <div className="mt-2 text-sm text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {selectedEventDetails.placeDetails.description}
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      className="w-full rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700" 
                      onClick={() => setSelectedEventDetails(null)}
                    >
                      Đóng
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {isAuthenticated && (
          <ChatPanel isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} timelineId={tripId} />
        )}
        {isAuthenticated && (
          <AgentPanel
            isOpen={isAgentOpen}
            onClose={() => setIsAgentOpen(false)}
            timelineId={tripId}
            startDate={trip?.startDate}
            onTimelineUpdated={fetchTimeline}
          />
        )}
      </div>
    </DndProvider>
  );
}
