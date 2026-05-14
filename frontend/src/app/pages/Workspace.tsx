import { useEffect, useMemo, useState, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  Bike,
  ChevronDown,
  CalendarRange,
  Clock,
  GripVertical,
  MoreHorizontal,
  Navigation,
  Plus,
  TrendingUp,
  MapPin,
  Star,
  Pencil,
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription,
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '../components/ui/dialog';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../components/ui/popover';
import { Info } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Button as UIButton } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, mockUsers, TimelineItem, Location, mockTrips } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import TimelineBlock from '../components/TimelineBlock';
import { toast } from 'sonner';
import { setLastTripId } from '../lib/tripStorage';
import AddToItineraryDialog from '../components/AddToItineraryDialog';
import SearchPlacesDialog from '../components/SearchPlacesDialog';
import { Input } from '../components/ui/input';
import { useTimelineSocket } from '../hooks/useTimelineSocket';
import { useAuth } from '../context/AuthContext';
import { 
  getTimelineDetail, 
  mapApiTimelineToTimetable, 
  addTimelineEvent, 
  deleteTimelineEvent, 
  moveTimelineEvent, 
  reorderTimelineEvent 
} from '../lib/timelineApi';
import {
  enqueueRecommendationInteraction,
  flushRecommendationInteractionQueue,
} from '../lib/recommendationInteractionQueue';
import { buildInteractionBase } from '../lib/recommendationUtils';

export default function Workspace() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam || 'trip-1';
  const [searchParams] = useSearchParams();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const { lastMessage } = useTimelineSocket(tripId, token ?? "dummy_token");

  const isMockTrip = tripId === 'trip-1'; 

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [tripMetadata, setTripMetadata] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [timeEditorId, setTimeEditorId] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [addDetailsDialogOpen, setAddDetailsDialogOpen] = useState(false);
  const [selectedLocationForAdd, setSelectedLocationForAdd] = useState<Location | null>(null);

  const fetchTimeline = useCallback(async (isAutoRefresh = false) => {
    console.log("[Workspace] fetchTimeline called", { tripId, authLoading, hasToken: !!token, isAutoRefresh });
    
    if (authLoading) return;
    
    if (!token || !tripId || tripId === 'undefined' || (tripId === 'trip-1' && !isAuthenticated)) {
      console.log("[Workspace] Skipping fetch", { hasToken: !!token, tripId, isAuthenticated });
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.error("[Workspace] API fetch timed out");
      setIsLoading(false);
    }, 10000);

    try {
      if (!isAutoRefresh) setIsLoading(true); 
      console.log("[Workspace] Calling getTimelineDetail...");
      const detail = await getTimelineDetail(tripId, token!, controller.signal);
      console.log("[Workspace] getTimelineDetail success:", !!detail);
      if (detail) {
        console.log("[Workspace] API Response Events:", detail.events?.map(ev => ({
          id: ev.id,
          cat: ev.category,
          extId: ev.externalPlaceId,
          hasPlace: !!ev.place
        })));
      }
      clearTimeout(timeoutId);
      
      if (!detail) throw new Error("No timeline detail");

      const { items, tripMeta, placesByLocationId } = mapApiTimelineToTimetable(detail);
      setTimelineItems(items || []);
      setTripMetadata({ ...tripMeta, placesByLocationId });
      
      if (items && items.length > 0 && !selectedDate) {
        setSelectedDate(items[0].date);
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') return;
      console.error("[Workspace] Failed to fetch timeline:", error);
    } finally {
      setIsLoading(false);
    }
  }, [tripId, token, authLoading, isAuthenticated, selectedDate]);

  useEffect(() => {
    fetchTimeline();
    setLastTripId(tripId);
  }, [tripId, token, authLoading]);

  useEffect(() => {
    if (lastMessage) {
      const timer = setTimeout(() => {
        console.log("[Workspace] Debounced real-time refresh");
        fetchTimeline(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [lastMessage, fetchTimeline]);

  const trip = useMemo(() => {
    if (tripMetadata) return tripMetadata;
    return mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  }, [tripMetadata, tripId]);

  const moveTimelineItem = async (dragIndex: number, hoverIndex: number) => {
    if (!token) return;
    
    const dayItems = timelineItems.filter((t) => t.date === selectedDate);
    const dragItem = dayItems[dragIndex];
    if (!dragItem) return;

    try {
      // Optimistic update for UI smoothness
      setTimelineItems(prev => {
        const next = [...prev];
        const globalDragIdx = prev.findIndex(t => t.id === dragItem.id);
        const targetItem = dayItems[hoverIndex];
        const globalHoverIdx = prev.findIndex(t => t.id === targetItem.id);
        
        const [moved] = next.splice(globalDragIdx, 1);
        next.splice(globalHoverIdx, 0, moved!);
        return next;
      });

      await reorderTimelineEvent(tripId, dragItem.id, { orderIndex: hoverIndex }, token);
    } catch (error) {
      console.error('[Workspace] Failed to reorder:', error);
      toast.error('Không thể sắp xếp lại');
      fetchTimeline(); // Rollback
    }
  };

  const handleSelectLocation = (location: Location) => {
    setSelectedLocationForAdd(location);
    setSearchDialogOpen(false);
    setAddDetailsDialogOpen(true);
  };

  const handleCreateActivity = async (item: TimelineItem, tx?: any) => {
    if (!token) return;

    if (isMockTrip) {
      toast.error('Bạn đang ở chế độ xem mẫu. Vui lòng tạo hoặc chọn một chuyến đi thật để lưu hoạt động.');
      return;
    }
    
    // Persist the trip ID in localStorage for "Thời khóa biểu" and "Lịch trình của tôi" to find.
    setLastTripId(tripId);
    
    try {
      const dateStr = item.date || selectedDate || new Date().toISOString().slice(0, 10);
      
      // Clean ID to prevent double-prefixing in DB, but avoid picking longitude (last part of fallback IDs)
      let cleanExternalId = item.locationId;
      if (item.locationId.includes(':')) {
        const parts = item.locationId.split(':');
        const lastPart = parts[parts.length - 1];
        // If last part is a number (longitude), it's a fallback ID, we should try to find a better part or keep the whole
        if (lastPart && !isNaN(Number(lastPart)) && parts.length > 2) {
          // It's likely category:name:lat:lng, let's keep it as is or handle specifically
          cleanExternalId = item.locationId; 
        } else {
          cleanExternalId = lastPart || item.locationId;
        }
      }

      // Determine category with fallback
      const rawCategory = (item as any).category || selectedLocationForAdd?.category || selectedLocationForAdd?.recommendation?.category || 'ACTIVITY';
      const category = rawCategory.toString().toUpperCase();
      const validCategory = ['ACTIVITY', 'FOOD', 'DRINK', 'LODGING'].includes(category) ? category : 'ACTIVITY';

      const newEvent = await addTimelineEvent(tripId, {
        externalPlaceId: cleanExternalId,
        category: validCategory,
        startTime: `${dateStr}T${item.startTime}:00`,
        endTime: `${dateStr}T${item.endTime}:00`,
        notes: item.notes,
        orderIndex: 0,
        status: 'PLANNED'
      }, token);
      
      if (newEvent) {
        toast.success('Đã thêm hoạt động');
        // Log the interaction if we have a selected location for context
        if (selectedLocationForAdd) {
          enqueueRecommendationInteraction({
            ...buildInteractionBase(selectedLocationForAdd),
            eventType: 'ADD_TO_TIMELINE',
          });
          void flushRecommendationInteractionQueue();
        }
        fetchTimeline();
      }
    } catch (error: any) {
      console.error('[Workspace] Failed to add activity:', error);
      // Show the actual backend error message if available
      const errorMsg = error?.message || 'Không thể thêm hoạt động';
      const errorCode = error?.code || 'unknown';
      toast.error(`${errorMsg} (Mã: ${errorCode})`);
    }
  };

  const dates = useMemo(() => {
    const uniq = Array.from(new Set(timelineItems.map((t) => t.date))).sort();
    return uniq.length ? uniq : [new Date().toISOString().slice(0, 10)];
  }, [timelineItems]);

  useEffect(() => {
    if (!dates.includes(selectedDate)) setSelectedDate(dates[0]);
  }, [dates, selectedDate]);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && dates.includes(d)) {
      setSelectedDate(d);
    }
  }, [searchParams, dates]);

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

  const saveTimeEditor = async () => {
    if (!timeEditorId || !token) return;
    const item = timelineItems.find(t => t.id === timeEditorId);
    if (!item) return;

    try {
      const dateStr = item.date || new Date().toISOString().slice(0, 10);
      await moveTimelineEvent(tripId, timeEditorId, {
        startTime: `${dateStr}T${timeStart}:00`,
        endTime: `${dateStr}T${timeEnd}:00`,
      }, token);
      toast.success('Đã cập nhật thời gian');
      fetchTimeline();
    } catch (error) {
      console.error('[Workspace] Failed to update time:', error);
      toast.error('Cập nhật thất bại');
    }
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

  // Get locations from timeline items - show locations for the selected day only
  const timelineLocations = useMemo(() => {
    console.log("[Workspace] Mapping timeline locations", { 
      itemsCount: visibleTimelineItems.length,
      metaKeys: tripMetadata ? Object.keys(tripMetadata.placesByLocationId || {}) : [] 
    });

    return visibleTimelineItems
      .map((item) => {
        // 1. Try direct lookup from metadata
        let dbPlace = tripMetadata?.placesByLocationId?.[item.locationId];
        
        // 2. If not found, try stripping prefixes or matching by raw ID
        if (!dbPlace) {
          const cleanId = item.locationId.includes(':') ? item.locationId.split(':').pop() : item.locationId;
          dbPlace = Object.values(tripMetadata?.placesByLocationId || {}).find(p => String(p.id) === String(cleanId));
        }

        // 3. Last resort: check if any place in metadata has the same name (useful for fuzzy matches)
        if (!dbPlace) {
          const mockLoc = mockLocations.find(l => l.id === item.locationId);
          if (mockLoc) {
            dbPlace = Object.values(tripMetadata?.placesByLocationId || {}).find(p => p.name === mockLoc.name);
          }
        }
        
        // Debug exactly what we found
        if (dbPlace) {
          console.log(`[Workspace] Found candidate for ${item.locationId}:`, { 
            id: dbPlace.id, 
            lat: dbPlace.latitude, 
            lng: dbPlace.longitude 
          });
        }

        // Check for valid coordinates
        const hasDbCoords = dbPlace && 
                          dbPlace.latitude !== null && dbPlace.latitude !== undefined &&
                          dbPlace.longitude !== null && dbPlace.longitude !== undefined;

        if (hasDbCoords) {
          console.log(`[Workspace] Found DB coordinates for ${item.locationId}:`, { lat: dbPlace.latitude, lng: dbPlace.longitude });
          return {
            id: item.locationId,
            name: dbPlace.name || 'Địa điểm',
            lat: Number(dbPlace.latitude),
            lng: Number(dbPlace.longitude),
            image: dbPlace.imageUrl || '',
            tags: dbPlace.district ? [dbPlace.district] : [],
            category: (item.category || 'activity').toLowerCase(),
            rating: Number(dbPlace.rating || 0),
            price: 0,
            description: dbPlace.address || '',
            weather: 'both',
            vibe: 'moderate',
            budget: '$',
            duration: 60
          } as Location;
        }
        
        let fallback: Location | undefined;
        if (isMockTrip) {
          fallback = mockLocations.find((loc) => loc.id === item.locationId);
          if (fallback) {
            console.log(`[Workspace] Using mock fallback for ${item.locationId}`);
          }
        }
        return fallback;
      })
      .filter((loc): loc is Location => loc !== undefined && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));
  }, [timelineItems, visibleTimelineItems, tripMetadata, isMockTrip]);

  // Use the first location as the map center, or fallback to HCMC
  const mapCenter = useMemo<[number, number]>(() => {
    if (timelineLocations.length > 0) {
      return [timelineLocations[0].lat, timelineLocations[0].lng];
    }
    return [10.7769, 106.7009]; // HCMC Center
  }, [timelineLocations]);

  // Get coordinates for the route
  const routeCoordinates: [number, number][] = useMemo(() => 
    timelineLocations.map((loc) => [loc.lat, loc.lng]),
    [timelineLocations]
  );

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
        <div className="h-full max-w-[1440px] mx-auto w-full p-4 lg:p-6 flex flex-col lg:flex-row gap-5 min-h-0">
          {/* Column 1: Timeline - LỊCH TRÌNH CHUYẾN ĐI */}
          <div className="w-full lg:w-[540px] bg-[var(--vj-primary)] border border-[var(--vj-border)] flex flex-col rounded-2xl overflow-hidden shadow-2xl min-h-0">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 border-b border-[var(--vj-border)] bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)]">
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">Lịch Trình Chuyến Đi</h2>
                  <p className="mt-1 text-xs text-white/80">{trip.name}</p>
                </div>
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
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-2">
                  {onlineUsers.map((user) => (
                    <Avatar key={user.id} className="w-8 h-8 border-2 border-white ring-2 ring-green-400">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                <span className="text-sm text-white/90">{onlineUsers.length} đang hoạt động</span>
                <span className="text-[11px] rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-white/85">
                  {visibleTimelineItems.length} hoạt động hôm nay
                </span>
              </div>
            </div>

            {/* Day switcher + hints */}
            <div className="px-5 pb-5">
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

                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <Button size="sm" variant="outline" className="h-8 bg-white/10 border-white/25 text-white hover:bg-white/15" asChild>
                    <Link to={`/timetable/${tripId}`}>
                      <CalendarRange className="w-4 h-4 mr-1.5" />
                      Thời khoá biểu
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white shadow-sm"
                    onClick={() => setSearchDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Thêm hoạt động
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-white/70">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5">
                    <GripVertical className="w-3.5 h-3.5" />
                    Kéo thả để sắp xếp
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="underline decoration-dotted underline-offset-2 hover:text-white transition-colors cursor-help">
                          Hướng dẫn tránh trùng lịch
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-4 bg-slate-900 border-slate-800 text-white shadow-xl rounded-xl z-[1001]">
                        <div className="flex gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 h-fit">
                            <Info className="w-4 h-4" />
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm leading-none">Quy tắc thời gian</h4>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Hệ thống cho phép các hoạt động "chạm" nhau nhưng không được "chồng" lên nhau.
                            </p>
                            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
                              <div>
                                <div className="text-[10px] uppercase font-bold text-green-500 mb-1">Hợp lệ (✅)</div>
                                <div className="text-[10px] text-slate-500 bg-slate-800/50 p-1.5 rounded">
                                  Mục A: 08:00 - 09:00<br/>
                                  Mục B: 09:00 - 10:00
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase font-bold text-rose-500 mb-1">Trùng (❌)</div>
                                <div className="text-[10px] text-slate-500 bg-slate-800/50 p-1.5 rounded">
                                  Mục A: 08:00 - 09:30<br/>
                                  Mục B: 09:00 - 10:00
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 self-end">
                  ⌘/Ctrl + ↑/↓
                  <span className="text-white/55">để di chuyển mục đã chọn</span>
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Items */}
          <ScrollArea className="flex-1 min-h-0 p-5 bg-[var(--vj-primary)]">
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-white/70">
                  <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
                  <p className="text-sm font-medium">Đang tải dữ liệu lộ trình...</p>
                </div>
              ) : visibleTimelineItems.length === 0 && (
                <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white/90">
                  <div className="font-extrabold">Chưa có hoạt động cho ngày này</div>
                  <div className="text-sm text-white/70 mt-1">Bấm “Thêm hoạt động” hoặc thêm từ trang Khám Phá.</div>
                </div>
              )}
              {visibleTimelineItems.map((item, index) => {
                const dbPlace = tripMetadata?.placesByLocationId?.[item.locationId];
                const location = dbPlace ? {
                  id: item.locationId,
                  name: dbPlace.name,
                  lat: dbPlace.latitude,
                  lng: dbPlace.longitude,
                  image: dbPlace.imageUrl || '',
                  category: (item.category || 'activity').toLowerCase()
                } : mockLocations.find((loc) => loc.id === item.locationId);

                const displayName = dbPlace?.name || (tripMetadata?.labelByLocationId?.[item.locationId]) || 'Hoạt động';
                const displayImage = dbPlace?.imageUrl || location?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
                const isEditing = editingItem === item.id;
                const transport = getTransportMethod(index);
                const TransportIcon = transport.icon;
                const ownerUser = mockUsers[index % mockUsers.length];
                
                return (
                  <div key={item.id}>
                    <TimelineBlock
                      index={index}
                      item={item}
                      location={location}
                      displayName={displayName}
                      displayImage={displayImage}
                      moveItem={moveTimelineItem}
                      isEditing={isEditing}
                      onClick={() => setDetailsItemId(item.id)}
                      onEditStart={() => setEditingItem(item.id)}
                      onEditEnd={() => setEditingItem(null)}
                      isLast={index === visibleTimelineItems.length - 1}
                      ownerName={ownerUser?.name?.split(' ').slice(-1)[0]}
                      hasOverlap={overlaps.has(item.id)}
                      onEditTime={() => openTimeEditor(item.id)}
                      onDuplicate={async () => {
                        if (!token) return;
                        try {
                          const dateStr = item.date || new Date().toISOString().slice(0, 10);
                          await addTimelineEvent(tripId, {
                            externalPlaceId: item.locationId,
                            category: 'ACTIVITY',
                            startTime: `${dateStr}T${item.startTime}:00`,
                            endTime: `${dateStr}T${item.endTime}:00`,
                            notes: item.notes
                          }, token);
                          toast.success('Đã nhân bản hoạt động');
                          fetchTimeline();
                        } catch (error) {
                          toast.error('Nhân bản thất bại');
                        }
                      }}
                      onRemove={async () => {
                        if (!token) return;
                        try {
                          await deleteTimelineEvent(tripId, item.id, token);
                          toast.success('Đã xoá hoạt động');
                          fetchTimeline();
                        } catch (error) {
                          toast.error('Xoá thất bại');
                        }
                      }}
                    />

                    {/* Transportation Widget */}
                    {index < visibleTimelineItems.length - 1 && (
                      <div className="flex items-center justify-center gap-3 my-3 sm:ml-14">
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
          <div className="p-5 border-t border-white/10 bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)]">
            <Button
              className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-medium rounded-xl h-11"
              onClick={() => setSearchDialogOpen(true)}
            >
              + Thêm Hoạt Động Mới
            </Button>
          </div>
          </div>

          {/* Column 2: Map */}
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl border border-[var(--vj-border)] bg-white min-h-[360px] lg:min-h-0">
          {/* Panel title like reference */}
          <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl px-4 py-2 shadow-lg border border-slate-200">
            <h2 className="text-sm font-bold text-[#0b5d55]">Bản Đồ Lộ Trình</h2>
          </div>
          <div className="absolute top-16 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-slate-200 min-w-[220px]">
            <h3 className="font-bold text-sm text-[#0A4A6E] mb-2">Lộ Trình Tự Động</h3>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90">
                <Clock className="w-3.5 h-3.5" />
                <Badge variant="outline" className="border-white/20 text-white/90 text-[10px] font-medium h-5">7.5 giờ</Badge>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-white/90">
                <TrendingUp className="w-3.5 h-3.5" />
                <Badge variant="outline" className="border-white/20 text-white/90 text-[10px] font-medium h-5">Trung Bình</Badge>
              </div>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-lg border border-slate-200">
            <p className="text-xs font-semibold text-[#0A4A6E]">🗺️ {trip.destination}</p>
            <p className="text-[11px] text-slate-500 mt-1">Tối ưu thứ tự di chuyển theo ngày đang chọn</p>
          </div>

          <SimpleMap
            locations={timelineLocations}
            center={mapCenter}
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
            <DialogDescription>
              Thay đổi thời gian bắt đầu và kết thúc cho hoạt động này.
            </DialogDescription>
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

      <SearchPlacesDialog
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelect={handleSelectLocation}
      />

      {trip && (
        <AddToItineraryDialog
          open={addDetailsDialogOpen}
          onOpenChange={setAddDetailsDialogOpen}
          tripId={tripId}
          trip={trip}
          location={selectedLocationForAdd}
          users={mockUsers}
          onCreate={handleCreateActivity}
          defaultDate={selectedDate}
        />
      )}
      {/* Event Details Dialog */}
      <Dialog open={!!detailsItemId} onOpenChange={(open) => !open && setDetailsItemId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chi tiết hoạt động</DialogTitle>
          </DialogHeader>
          {(() => {
            const item = timelineItems.find(t => t.id === detailsItemId);
            if (!item) return null;
            
            const dbPlace = tripMetadata?.placesByLocationId?.[item.locationId];
            const location = dbPlace ? {
              id: item.locationId,
              name: dbPlace.name,
              lat: dbPlace.latitude,
              lng: dbPlace.longitude,
              image: dbPlace.imageUrl || '',
              address: dbPlace.address,
              rating: dbPlace.rating
            } : mockLocations.find(l => l.id === item.locationId);
            
            const displayName = dbPlace?.name || location?.name || tripMetadata?.labelByLocationId?.[item.locationId] || 'Hoạt động';
            const displayImage = dbPlace?.imageUrl || location?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
            const address = dbPlace?.address || location?.address;
            const rating = dbPlace?.rating || location?.rating;
            
            return (
              <div className="py-4 space-y-5">
                {/* Event Header - Time & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Clock className="w-5 h-5 text-[var(--vj-accent)]" />
                    <span>{item.startTime} - {item.endTime}</span>
                  </div>
                  <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200 uppercase text-[10px]">
                    {item.category || 'HOẠT ĐỘNG'}
                  </Badge>
                </div>

                {/* User Notes - High Priority */}
                <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" />
                    Ghi chú của bạn
                  </h4>
                  <p className="text-sm text-slate-700 leading-relaxed italic">
                    {item.notes?.trim() ? item.notes : "Không có ghi chú nào cho hoạt động này."}
                  </p>
                </div>

                {/* Place Context - Secondary */}
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-slate-200">
                      <img
                        src={displayImage}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 py-0.5">
                      <h4 className="text-sm font-bold text-slate-900 truncate mb-1">{displayName}</h4>
                      {address && (
                        <div className="flex items-start gap-1 text-xs text-slate-500 line-clamp-2">
                          <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>{address}</span>
                        </div>
                      )}
                      {rating && (
                        <div className="flex items-center gap-1 text-xs text-amber-500 font-bold mt-1">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DndProvider>
  );
}
