import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
  LocateFixed,
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
import {
  Sheet,
  SheetContent,
} from '../components/ui/sheet';
import { Info } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Button as UIButton } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { createDefaultTrip, displayTripDestination, LEGACY_DEMO_TRIP_ID, type Location, type TimelineItem, type User } from '../types/domain';
import SimpleMap from '../components/SimpleMap';
import type { LeafletMapApi } from '../components/LeafletMapView';
import TimelineBlock from '../components/TimelineBlock';
import { DateScrollStrip } from '../components/DateScrollStrip';
import { toast } from 'sonner';
import { fetchRoadRoutePolyline, type LatLngTuple } from '../lib/roadRoute';
import { setLastTripId } from '../lib/tripStorage';
import { cacheGet, cacheSet, cacheClear } from '../lib/apiCache';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { useGeolocation } from '../hooks/useGeolocation';
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
  reorderTimelineEvent,
  getPendingProposals
} from '../lib/timelineApi';
import {
  enqueueRecommendationInteraction,
  flushRecommendationInteractionQueue,
} from '../lib/recommendationInteractionQueue';
import { buildInteractionBase } from '../lib/recommendationUtils';
import ProposalSidebar from '../components/ProposalSidebar';

const isoLocalDateTimeToHHmm = (iso: string) => {
  if (!iso) return '';
  return iso.slice(11, 16);
};

export default function Workspace() {
  const { tripId: tripIdParam } = useParams();
  const tripId = tripIdParam || LEGACY_DEMO_TRIP_ID;
  const [searchParams] = useSearchParams();
  const { user, token, loading: authLoading, isAuthenticated } = useAuth();
  const { lastMessage, sendProposal } = useTimelineSocket(tripId, token ?? "dummy_token");

  const isMockTrip = tripId === LEGACY_DEMO_TRIP_ID;

  const CACHE_KEY = `timeline:${tripId}`;

  const cachedDetail = cacheGet<{ items: TimelineItem[]; tripMeta: any; placesByLocationId: any; proposals: any[] }>(CACHE_KEY);

  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>(cachedDetail?.items ?? []);
  const [tripMetadata, setTripMetadata] = useState<any>(
    cachedDetail ? { ...cachedDetail.tripMeta, placesByLocationId: cachedDetail.placesByLocationId } : null
  );
  const [isLoading, setIsLoading] = useState(!cachedDetail);
  const [pendingProposals, setPendingProposals] = useState<any[]>(cachedDetail?.proposals ?? []);

  const isOwner = useMemo(() => {
    if (!user || !tripMetadata) return false;
    return user.id === tripMetadata.ownerId;
  }, [user, tripMetadata]);

  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useLocalStorageState<string>(`vj:workspace:${tripId}:selected-date`, '');
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [timeEditorId, setTimeEditorId] = useState<string | null>(null);
  const [timeStart, setTimeStart] = useState('09:00');
  const [timeEnd, setTimeEnd] = useState('10:00');

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [addDetailsDialogOpen, setAddDetailsDialogOpen] = useState(false);
  const [selectedLocationForAdd, setSelectedLocationForAdd] = useState<Location | null>(null);
  const [proposalSidebarOpen, setProposalSidebarOpen] = useLocalStorageState<boolean>(`vj:workspace:${tripId}:proposal-sidebar`, false);

  const fetchTimeline = useCallback(async (isAutoRefresh = false) => {
    console.log("[Workspace] fetchTimeline called", { tripId, authLoading, hasToken: !!token, isAutoRefresh });
    
    if (authLoading) return;
    
    if (!token || !tripId || tripId === 'undefined' || (tripId === LEGACY_DEMO_TRIP_ID && !isAuthenticated)) {
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
        
        const { items, tripMeta, placesByLocationId, labelByLocationId: labels } = mapApiTimelineToTimetable(detail);
        const freshItems = items || [];
        setTimelineItems(freshItems);
        setTripMetadata({ ...tripMeta, placesByLocationId });

        // Persist into cache (proposals fetched below)
        let proposals: any[] = [];
        try {
          proposals = await getPendingProposals(tripId, token!) ?? [];
        } catch (e) {
          console.error("[Workspace] Failed to fetch proposals:", e);
        }
        setPendingProposals(proposals);
        cacheSet(CACHE_KEY, { items: freshItems, tripMeta, labelByLocationId: labels, placesByLocationId, proposals });
      } else {
        setTimelineItems([]);
      }

      clearTimeout(timeoutId);
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
      console.log("[Workspace] WebSocket message received:", lastMessage.type);
      
      const isProposalEvent = lastMessage.type?.startsWith('PROPOSAL_');
      
      // Immediate local state updates for snappy UI responsiveness
      if (lastMessage.type === 'PROPOSAL_UPDATED' || lastMessage.type === 'PROPOSAL_DECIDED') {
        const decidedId = lastMessage.proposalId || lastMessage.data?.id;
        if (decidedId) {
          setPendingProposals(prev => prev.filter(p => String(p.id) !== String(decidedId)));
        }
      }

      if (lastMessage.type === 'PROPOSAL_CREATED' || lastMessage.type === 'PROPOSAL_SUBMITTED') {
        const newProposal = lastMessage.data;
        if (newProposal && newProposal.status === 'PENDING') {
          setPendingProposals(prev => {
            const exists = prev.some(p => String(p.id) === String(newProposal.id));
            if (exists) return prev;
            return [...prev, newProposal];
          });
        }
      }

      // Mimic refresh: Force a fresh fetch from API for all proposal events
      // This ensures that all items, metadata, and versions are in sync with the server
      if (isProposalEvent) {
        console.log("[Workspace] Mimicking refresh for proposal event");
        // We use a very short delay to let the backend finish its transaction if needed
        setTimeout(() => fetchTimeline(true), 100);
      } else {
        const timer = setTimeout(() => {
          console.log("[Workspace] Debounced data refresh after other socket event");
          fetchTimeline(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [lastMessage, fetchTimeline]);

  const trip = useMemo(() => {
    if (tripMetadata) return tripMetadata;
    return createDefaultTrip(tripId);
  }, [tripMetadata, tripId]);

  const itineraryUsers = useMemo<User[]>(() => {
    if (!user) return [];
    return [{
      id: String(user.id),
      name: user.displayName?.trim() || user.username,
      email: '',
      avatar: '',
      preferences: { pace: 3, budgetLevel: 2, favoriteCategories: [] },
    }];
  }, [user]);

  const moveTimelineItem = async (dragIndex: number, hoverIndex: number) => {
    if (!token) return;
    
    const dayItems = timelineItems.filter((t) => t.date === selectedDate);
    const dragItem = dayItems[dragIndex];
    if (!dragItem) return;

    if (!isOwner) {
      // Contributor: Send proposal instead of direct update
      sendProposal(tripId, tripMetadata?.version || 1, "MOVE", {
        eventId: dragItem.id,
        orderIndex: hoverIndex,
        startTime: dragItem.startTime,
        endTime: dragItem.endTime
      });
      toast.info("Đã gửi đề xuất thay đổi");
      setTimeout(() => fetchTimeline(true), 100);
      return;
    }

    try {
      // Optimistic update for UI smoothness (Owner only for now)
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
      cacheClear(CACHE_KEY);
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
    
    const dateStr = item.date || selectedDate || new Date().toISOString().slice(0, 10);
    
    // Clean ID to prevent double-prefixing in DB
    let cleanExternalId = item.locationId;
    if (item.locationId.includes(':')) {
      const parts = item.locationId.split(':');
      const lastPart = parts[parts.length - 1];
      if (lastPart && !isNaN(Number(lastPart)) && parts.length > 2) {
        cleanExternalId = item.locationId; 
      } else {
        cleanExternalId = lastPart || item.locationId;
      }
    }

    // Determine category with fallback
    const rawCategory = (item as any).category || selectedLocationForAdd?.category || selectedLocationForAdd?.recommendation?.category || 'ACTIVITY';
    const category = rawCategory.toString().toUpperCase();
    const validCategory = ['ACTIVITY', 'FOOD', 'DRINK', 'LODGING'].includes(category) ? category : 'ACTIVITY';

    if (!isOwner) {
      // Contributor: Send proposal instead of direct update
      sendProposal(tripId, tripMetadata?.version || 1, "ADD", {
        externalPlaceId: cleanExternalId,
        category: validCategory,
        startTime: `${dateStr}T${item.startTime}:00`,
        endTime: `${dateStr}T${item.endTime}:00`,
        notes: item.notes,
        orderIndex: 0,
        status: 'PLANNED',
        latitude: selectedLocationForAdd?.lat,
        longitude: selectedLocationForAdd?.lng,
        placeName: selectedLocationForAdd?.name
      });
      toast.info("Đã gửi đề xuất thêm hoạt động");
      setAddDetailsDialogOpen(false);
      setTimeout(() => fetchTimeline(true), 100);
      return;
    }

    try {
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
        if (selectedLocationForAdd) {
          enqueueRecommendationInteraction({
            ...buildInteractionBase(selectedLocationForAdd),
            eventType: 'ADD_TO_TIMELINE',
          });
          void flushRecommendationInteractionQueue();
        }
        cacheClear(CACHE_KEY);
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

  const mappedProposals = useMemo(() => {
    if (!pendingProposals.length) return [];
    
    console.log("[Workspace] Mapping pending proposals:", pendingProposals.length);
    
    return pendingProposals
      .filter(p => p.status === 'PENDING')
      .map(p => {
        try {
          // Robust payload parsing: handle objects or JSON strings
          let payload = p.payload;
          if (typeof payload === 'string') {
            try { payload = JSON.parse(payload); } catch (e) { return null; }
          }
          if (!payload) return null;

          const rawStartTime = payload.startTime || payload.start_time || '';
          const rawEndTime = payload.endTime || payload.end_time || '';
          
          // Improved date extraction: Ensure we have a YYYY-MM-DD format
          let date = '';
          if (rawStartTime.includes('T')) {
            date = rawStartTime.split('T')[0];
          } else if (/^\d{4}-\d{2}-\d{2}/.test(rawStartTime)) {
            date = rawStartTime.slice(0, 10);
          } else {
            // Fallback: If no date in payload, use the first date of the trip or today
            date = timelineItems[0]?.date || new Date().toISOString().slice(0, 10);
          }

          // Handle ADD/MOVE/DELETE to create ghost items
          if (p.changeType === 'ADD' || p.changeType === 'MOVE' || p.changeType === 'DELETE') {
            return {
              id: `proposal-${p.id}`,
              locationId: payload.externalPlaceId || payload.external_place_id || (p.changeType === 'DELETE' ? (payload.eventId || payload.event_id) : ''),
              startTime: isoLocalDateTimeToHHmm(rawStartTime),
              endTime: isoLocalDateTimeToHHmm(rawEndTime),
              date: date,
              notes: payload.notes,
              isPending: true,
              authorUsername: p.authorUsername,
              proposalId: p.id,
              changeType: p.changeType,
              latitude: payload.latitude !== undefined ? Number(payload.latitude) : (payload.lat !== undefined ? Number(payload.lat) : undefined),
              longitude: payload.longitude !== undefined ? Number(payload.longitude) : (payload.lng !== undefined ? Number(payload.lng) : undefined),
              placeName: payload.placeName || payload.place_name || payload.name
            } as any;
          }
        } catch (err) {
          console.error("[Workspace] Error mapping proposal:", p.id, err);
        }
        return null;
      })
      .filter(Boolean);
  }, [pendingProposals, timelineItems]);

  useEffect(() => {
    if (mappedProposals.length > 0) {
      console.log("[Workspace] Mapped Proposals for Ghost UI:", mappedProposals.map(p => ({
        id: p.id,
        place: p.placeName,
        coords: [p.latitude, p.longitude],
        isPending: p.isPending
      })));
    }
  }, [mappedProposals]);

  const dates = useMemo(() => {
    const itemDates = timelineItems.map((t) => t.date);
    const proposalDates = mappedProposals.map((p) => p.date);
    const uniq = Array.from(new Set([...itemDates, ...proposalDates])).filter(Boolean).sort();
    return uniq.length ? uniq : [new Date().toISOString().slice(0, 10)];
  }, [timelineItems, mappedProposals]);

  useEffect(() => {
    if (dates.length > 0 && (!selectedDate || !dates.includes(selectedDate))) {
      console.log("[Workspace] Auto-selecting initial date:", dates[0]);
      setSelectedDate(dates[0]);
    }
  }, [dates, selectedDate]);

  useEffect(() => {
    const d = searchParams.get('date');
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d) && dates.includes(d)) {
      setSelectedDate(d);
    }
  }, [searchParams, dates]);

  const visibleTimelineItems = useMemo(() => {
    const actualItems = timelineItems.filter((t) => t.date === selectedDate);
    const ghostItems = mappedProposals.filter((p) => p.date === selectedDate);
    
    // Combine and sort by start time
    return [...actualItems, ...ghostItems].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [timelineItems, mappedProposals, selectedDate]);

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
      
      if (!isOwner) {
        sendProposal(tripId, tripMetadata?.version || 1, "MOVE", {
          eventId: timeEditorId,
          startTime: `${dateStr}T${timeStart}:00`,
          endTime: `${dateStr}T${timeEnd}:00`,
        });
        toast.info("Đã gửi đề xuất thay đổi thời gian");
        setTimeEditorOpen(false);
        return;
      }

      await moveTimelineEvent(tripId, timeEditorId, {
        startTime: `${dateStr}T${timeStart}:00`,
        endTime: `${dateStr}T${timeEnd}:00`,
      }, token);
      toast.success('Đã cập nhật thời gian');
      cacheClear(CACHE_KEY);
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
    const locations = visibleTimelineItems
      .map((item) => {
        const isPending = (item as any).isPending || false;
        const authorUsername = (item as any).authorUsername;
        const proposalLat = (item as any).latitude;
        const proposalLng = (item as any).longitude;

        // 1. Try payload coordinates first (for Ghost Pins) - checking both full names and short names
        const finalLat = proposalLat !== undefined ? Number(proposalLat) : ((item as any).lat !== undefined ? Number((item as any).lat) : undefined);
        const finalLng = proposalLng !== undefined ? Number(proposalLng) : ((item as any).lng !== undefined ? Number((item as any).lng) : undefined);

        if (isPending && finalLat !== undefined && finalLng !== undefined && Number.isFinite(finalLat) && Number.isFinite(finalLng)) {
          return {
            id: item.id,
            name: (item as any).placeName || 'Địa điểm đề xuất',
            lat: finalLat,
            lng: finalLng,
            image: '',
            category: (item.category || 'activity').toLowerCase(),
            isPending: true,
            authorUsername: authorUsername
          } as Location & { isPending: boolean; authorUsername: string };
        }

        // 2. Try lookup from tripMetadata (for both real and ghost items if payload is missing)
        let dbPlace = tripMetadata?.placesByLocationId?.[item.locationId];
        if (!dbPlace) {
          const cleanId = item.locationId.includes(':') ? item.locationId.split(':').pop() : item.locationId;
          dbPlace = Object.values(tripMetadata?.placesByLocationId || {}).find(p => String(p.id) === String(cleanId));
        }

        if (dbPlace && dbPlace.latitude != null && dbPlace.longitude != null) {
          return {
            id: isPending ? item.id : item.locationId,
            name: dbPlace.name || 'Địa điểm',
            lat: Number(dbPlace.latitude),
            lng: Number(dbPlace.longitude),
            image: dbPlace.imageUrl || '',
            category: (item.category || 'activity').toLowerCase(),
            isPending: isPending,
            authorUsername: authorUsername
          } as Location & { isPending: boolean; authorUsername?: string };
        }
        
        console.warn(`[Workspace] No coordinates found for item:`, item.id, item.locationId);
        return null;
      })
      .filter((loc): loc is Location & { isPending: boolean; authorUsername?: string } => 
        loc !== null && Number.isFinite(loc.lat) && Number.isFinite(loc.lng));

    console.log("[Workspace] Map pins to render:", locations.map(l => ({ name: l.name, pending: l.isPending })));
    return locations;
  }, [visibleTimelineItems, tripMetadata, isMockTrip]);

  // Use the first location as the map center, or fallback to HCMC
  const mapCenter = useMemo<[number, number]>(() => {
    if (timelineLocations.length > 0) {
      return [timelineLocations[0].lat, timelineLocations[0].lng];
    }
    return [10.7769, 106.7009]; // HCMC Center
  }, [timelineLocations]);

  const stopsForRoute = useMemo<LatLngTuple[]>(
    () =>
      timelineLocations
        .map((loc) => [loc.lat, loc.lng] as LatLngTuple)
        .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng)),
    [timelineLocations],
  );

  const [routePolyline, setRoutePolyline] = useState<LatLngTuple[]>([]);
  const [routeResolving, setRouteResolving] = useState(false);
  const { position: userLocation, accuracy: userAccuracy, status: geoStatus } = useGeolocation(true);
  const mapApiRef = useRef<LeafletMapApi | null>(null);

  useEffect(() => {
    if (stopsForRoute.length < 2) {
      setRoutePolyline(stopsForRoute);
      setRouteResolving(false);
      return;
    }

    const ctrl = new AbortController();
    setRoutePolyline(stopsForRoute);
    setRouteResolving(true);

    fetchRoadRoutePolyline(stopsForRoute, { signal: ctrl.signal })
      .then((coords) => {
        if (!ctrl.signal.aborted) setRoutePolyline(coords);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setRoutePolyline(stopsForRoute);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setRouteResolving(false);
      });

    return () => ctrl.abort();
  }, [stopsForRoute]);

  // Keep straight-line coords for labelled markers fallback if needed elsewhere
  const routeCoordinates: [number, number][] = stopsForRoute;

  const getTransportMethod = (index: number) => {
    // Alternate between motorbike and walking for Vietnam context
    const methods = [
      { icon: Bike, label: 'Xe Máy', time: '12 phút' },
      { icon: Navigation, label: 'Đi Bộ', time: '8 phút' },
    ];
    return methods[index % 2];
  };

  const onlineUsers = itineraryUsers;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full bg-[var(--vj-bg)]">
        <div className="h-full max-w-[var(--vj-content-wide-max)] mx-auto w-full px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)] flex flex-col lg:flex-row gap-[var(--vj-layout-gap)] min-h-0">
          {/* Column 1: Timeline - LỊCH TRÌNH CHUYẾN ĐI */}
          <div className="w-full min-w-0 overflow-hidden lg:w-[min(33.75rem,100%)] lg:max-w-[var(--vj-panel-max)] lg:shrink-0 bg-[var(--vj-primary)]/40 backdrop-blur-3xl border border-[var(--vj-border)] flex flex-col rounded-3xl shadow-[var(--vj-shadow-premium)] min-h-0 transition-all duration-700 ease-[var(--vj-ease-out-expo)]">
          {/* Sticky header */}
          <div className="sticky top-0 z-20 border-b border-white/5 bg-gradient-to-br from-[var(--vj-primary)]/80 via-[var(--vj-primary)]/40 to-transparent backdrop-blur-xl">
            <div className="p-[var(--vj-inset)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-black text-white tracking-tight drop-shadow-sm sm:text-2xl">Lịch Trình Chuyến Đi</h2>
                  <p className="mt-1 text-xs font-medium text-white/70 uppercase tracking-widest truncate">{trip.name}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 bg-white/5 border-white/10 text-white hover:bg-white/15 hover:border-white/20 transition-all duration-300 rounded-xl font-bold"
                    onClick={() => toast('Thêm tiện ích', { description: 'Sắp ra mắt.' })}
                  >
                    Tiện ích
                    <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-9 w-9 bg-white/5 border-white/10 text-white hover:bg-white/15 hover:border-white/20 transition-all duration-300 rounded-xl"
                    aria-label="More"
                    onClick={() => toast('Tuỳ chọn', { description: 'Sắp ra mắt.' })}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              {/* Online Users */}
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5">
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
            <div className="px-[var(--vj-inset)] pb-[var(--vj-inset)]">
              <div className="flex flex-col gap-3">
                <DateScrollStrip
                  activeId={selectedDate}
                  className="rounded-2xl border border-white/15 bg-white/10 p-1.5"
                >
                  {dates.map((d, index) => {
                    const isActive = d === selectedDate;
                    const dateObj = new Date(`${d}T12:00:00Z`);
                    const weekday = dateObj.toLocaleDateString('vi-VN', { weekday: 'short' });
                    const dayMonth = dateObj.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                    return (
                      <button
                        key={d}
                        type="button"
                        data-scroll-active={isActive ? 'true' : undefined}
                        onClick={() => setSelectedDate(d)}
                        className={`flex shrink-0 flex-col items-center justify-center rounded-xl px-3 py-1 leading-tight transition-colors ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-white/80 hover:bg-white/15 hover:text-white'
                        }`}
                        aria-pressed={isActive}
                        title={`Ngày ${index + 1}`}
                      >
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isActive ? 'text-[var(--vj-accent)]' : 'text-white/55'}`}>
                          {weekday}
                        </span>
                        <span className="text-sm font-bold tabular-nums">{dayMonth}</span>
                      </button>
                    );
                  })}
                </DateScrollStrip>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setProposalSidebarOpen(!proposalSidebarOpen)}
                    className={`h-8 border-white/25 text-white hover:bg-white/15 ${proposalSidebarOpen ? 'bg-white/20' : 'bg-white/10'}`}
                  >
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    Đề xuất
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 bg-white/10 border-white/25 text-white hover:bg-white/15" asChild>
                    <Link
                      to="/"
                      onClick={() => {
                        setLastTripId(tripId);
                        try {
                          window.localStorage.setItem('vj:discovery:current-trip-id', JSON.stringify(tripId));
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      <CalendarRange className="w-4 h-4 mr-1.5" />
                      Thời khoá biểu
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white shadow-sm"
                    onClick={() => setSearchDialogOpen(true)}
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Thêm hoạt động
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 text-xs text-white/70 sm:flex-row sm:items-end sm:justify-between">
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
                <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0">
                  ⌘/Ctrl + ↑/↓
                  <span className="text-white/55">để di chuyển mục đã chọn</span>
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Items */}
          <ScrollArea className="flex-1 min-h-0 min-w-0 bg-[var(--vj-primary)]">
            <div className="min-w-0 w-full space-y-3 p-[var(--vj-inset)] pb-4">
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
                const isPending = (item as any).isPending || false;
                const authorUsername = (item as any).authorUsername;

                // CRITICAL FIX: Correctly resolve location for Ghost Items
                let location: any = null;
                if (isPending && (item as any).latitude !== undefined) {
                  location = {
                    id: item.locationId,
                    name: (item as any).placeName || 'Địa điểm đề xuất',
                    lat: (item as any).latitude,
                    lng: (item as any).longitude,
                    image: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
                    category: (item.category || 'activity').toLowerCase(),
                    isPending: true
                  };
                } else {
                  const dbPlace = tripMetadata?.placesByLocationId?.[item.locationId];
                  location = dbPlace ? {
                    id: item.locationId,
                    name: dbPlace.name,
                    lat: dbPlace.latitude,
                    lng: dbPlace.longitude,
                    image: dbPlace.imageUrl || '',
                    category: (item.category || 'activity').toLowerCase()
                  } : null;
                }

                const displayName = location?.name || (tripMetadata?.labelByLocationId?.[item.locationId]) || 'Hoạt động';
                const displayImage = location?.image || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
                const isEditing = editingItem === item.id;
                const transport = getTransportMethod(index);
                const TransportIcon = transport.icon;
                const ownerUser = itineraryUsers[0];
                
                return (
                  <div key={item.id} className="min-w-0">
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
                      ownerName={isPending ? authorUsername : (ownerUser?.name?.split(' ').slice(-1)[0])}
                      hasOverlap={overlaps.has(item.id)}
                      isPending={isPending}
                      onEditTime={() => openTimeEditor(item.id)}
                      onDuplicate={async () => {
                        if (!token) return;
                        const dateStr = item.date || new Date().toISOString().slice(0, 10);
                        if (!isOwner) {
                          sendProposal(tripId, tripMetadata?.version || 1, "ADD", {
                            externalPlaceId: item.locationId,
                            category: 'ACTIVITY',
                            startTime: `${dateStr}T${item.startTime}:00`,
                            endTime: `${dateStr}T${item.endTime}:00`,
                            notes: item.notes
                          });
                          toast.info("Đã gửi đề xuất nhân bản");
                          return;
                        }
                        try {
                          await addTimelineEvent(tripId, {
                            externalPlaceId: item.locationId,
                            category: 'ACTIVITY',
                            startTime: `${dateStr}T${item.startTime}:00`,
                            endTime: `${dateStr}T${item.endTime}:00`,
                            notes: item.notes
                          }, token);
                          toast.success('Đã nhân bản hoạt động');
                          cacheClear(CACHE_KEY);
                          fetchTimeline();
                        } catch (error) {
                          toast.error('Nhân bản thất bại');
                        }
                      }}
                      onRemove={async () => {
                        if (!token) return;
                        if (!isOwner) {
                          sendProposal(tripId, tripMetadata?.version || 1, "DELETE", { eventId: item.id });
                          toast.info("Đã gửi đề xuất xóa");
                          setTimeout(() => fetchTimeline(true), 100);
                          return;
                        }
                        try {
                          await deleteTimelineEvent(tripId, item.id, token);
                          toast.success('Đã xoá hoạt động');
                          cacheClear(CACHE_KEY);
                          fetchTimeline();
                        } catch (error) {
                          toast.error('Xoá thất bại');
                        }
                      }}
                    />

                    {/* Transportation Widget */}
                    {index < visibleTimelineItems.length - 1 && (
                      <div className="my-2 flex items-center pl-12 sm:pl-14">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white/90 shadow-sm">
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
          </div>

          {/* Column 2: Map */}
          <div className="flex-1 relative rounded-3xl overflow-hidden shadow-[var(--vj-shadow-premium)] border border-white/10 bg-white min-h-[min(42vh,22rem)] lg:min-h-0 transition-all duration-700 ease-[var(--vj-ease-out-expo)]">
          {/* Panel title like reference */}
          <div className="absolute top-[var(--vj-inset)] left-[var(--vj-inset)] z-[1000] bg-white/70 backdrop-blur-md rounded-2xl px-5 py-2.5 shadow-lg border border-white/30 transition-all duration-300 hover:bg-white/80">
            <h2 className="text-sm font-black text-[#0b5d55] tracking-tight">Bản Đồ Lộ Trình</h2>
          </div>
          <div className="absolute top-[calc(var(--vj-inset)+3.5rem)] left-[var(--vj-inset)] z-[1000] bg-white/80 backdrop-blur-xl rounded-2xl p-[var(--vj-inset)] shadow-xl border border-white/40 min-w-[240px] max-w-[calc(100%-2*var(--vj-inset))] transition-all duration-500 hover:shadow-2xl hover:-translate-y-0.5">
            <h3 className="font-black text-sm text-[#0A4A6E] mb-3 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Lộ Trình Tự Động
            </h3>
            <div className="flex flex-col gap-1 text-xs text-slate-600 font-bold">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>7.5 giờ</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>Trung Bình</span>
                </div>
              </div>
              <p className="text-[10px] font-semibold text-slate-500 normal-case leading-snug">
                {routeResolving
                  ? 'Đang vẽ lộ trình theo đường đi…'
                  : stopsForRoute.length >= 2
                    ? 'Tuyến nối các điểm theo đường lái xe (OSM/OpenStreetMap).'
                    : 'Thêm ít nhất hai hoạt động có vị trí để xem lộ trình.'}
              </p>
            </div>
          </div>

          <div className="absolute bottom-[var(--vj-inset)] left-[var(--vj-inset)] z-[1000] bg-[#0b5d55]/90 backdrop-blur-xl rounded-2xl p-[var(--vj-inset)] shadow-2xl border border-white/20 text-white min-w-[200px] max-w-[calc(100%-2*var(--vj-inset))]">
            <p className="text-sm font-black tracking-tight flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {displayTripDestination(trip.destination)}
            </p>
            {geoStatus === 'loading' ? (
              <p className="mt-2 text-[10px] text-blue-200">Đang định vị GPS…</p>
            ) : geoStatus === 'denied' ? (
              <p className="mt-2 text-[10px] text-amber-200">Cho phép truy cập vị trí để hiển thị đúng trên bản đồ.</p>
            ) : userAccuracy && userAccuracy > 1500 ? (
              <p className="mt-2 text-[10px] text-amber-200">
                GPS chưa chính xác ({userAccuracy >= 1000 ? `${Math.round(userAccuracy / 1000)} km` : `${Math.round(userAccuracy)} m`}) — thử ra ngoài trời hoặc dùng điện thoại.
              </p>
            ) : null}
          </div>

          <SimpleMap
            locations={timelineLocations}
            center={mapCenter}
            userLocation={userLocation ?? undefined}
            userAccuracy={userAccuracy ?? undefined}
            showRoute={true}
            routeCoordinates={routePolyline.length >= 2 ? routePolyline : routeCoordinates}
            onMapReady={(api) => {
              mapApiRef.current = api;
            }}
          />

          {userLocation ? (
            <button
              type="button"
              aria-label="Vị trí của tôi"
              title="Vị trí của tôi"
              className="absolute top-[calc(var(--vj-inset)+3.75rem)] right-[var(--vj-inset)] z-[1100] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/90 bg-white text-[#1a73e8] shadow-[0_2px_8px_rgba(0,0,0,0.22)] transition hover:bg-slate-50 active:scale-95 active:bg-slate-100 pointer-events-auto touch-manipulation"
              onClick={() => mapApiRef.current?.flyToUser()}
            >
              <LocateFixed className="h-6 w-6" strokeWidth={2.25} />
            </button>
          ) : null}
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
          users={itineraryUsers}
          onCreate={handleCreateActivity}
          defaultDate={selectedDate}
        />
      )}
      {/* Event Details Dialog */}
      <Dialog open={!!detailsItemId} onOpenChange={(open) => !open && setDetailsItemId(null)}>
        <DialogContent className="sm:max-w-[600px]">
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
            } : null;
            
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

      <Sheet open={proposalSidebarOpen} onOpenChange={setProposalSidebarOpen}>
        <SheetContent side="right" className="p-0 w-80 sm:w-96 border-l shadow-2xl">
          <ProposalSidebar 
            timelineId={tripId} 
            token={token!} 
            currentVersion={tripMetadata?.version || 1}
            onProposalDecided={(id) => {
              setPendingProposals(prev => prev.filter(p => String(p.id) !== String(id)));
              fetchTimeline(true);
            }}
            isOwner={isOwner}
            currentUsername={user?.username}
          />
        </SheetContent>
      </Sheet>
    </DndProvider>
  );
}
