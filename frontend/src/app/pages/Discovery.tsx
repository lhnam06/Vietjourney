import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, CalendarRange, Clock, GripVertical, MapPin, RefreshCw, Search, Sparkles, Star, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, Location, TimelineItem, mockTrips, mockUsers, mockTimeline, mockTransactions } from '../data/mockData';
import { toast } from 'sonner';
import AddToItineraryDialog from '../components/AddToItineraryDialog';
import { addTimelineEvent, getMyTimelines, getTimelineDetail, mapApiTimelineToTimetable } from '../lib/timelineApi';
import { appendTransaction, getLastTripId, loadTripData, setLastTripId, upsertTimelineItem } from '../lib/tripStorage';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { getRecommendedPlaces } from '../lib/recommendationApi';
import {
  enqueueRecommendationInteraction,
  flushRecommendationInteractionQueue,
} from '../lib/recommendationInteractionQueue';
import { filterPlaces } from '../lib/placesApi';
import {
  buildInteractionBase,
  HCMC_CENTER,
  inferCategoryFromLocation,
  locationSearchText,
  placeApiRowToLocation,
  recommendedPlaceToLocation,
} from '../lib/recommendationUtils';
import { ApiError } from '../lib/api';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { onLocationImageError } from '../lib/imagePlaceholder';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import {
  TIMETABLE_DAY_END_HOUR,
  TIMETABLE_DAY_START_HOUR,
  PX_PER_HOUR,
  daySpanMinutes,
  eachTripDay,
  layoutsByDate,
  type TimetableBlock,
} from '../lib/timetableLayout';

type CategoryFilter = 'all' | 'food' | 'drink' | 'activity';
type PriceFilter = 'all' | 'free' | 'budget' | 'mid' | 'premium';
type SortFilter = 'relevance' | 'rating' | 'priceAsc' | 'priceDesc';

const categoryFilterOptions: Array<{ value: CategoryFilter; label: string }> = [
  { value: 'all', label: 'Tất cả loại hình' },
  { value: 'food', label: 'Ẩm thực' },
  { value: 'drink', label: 'Đồ uống' },
  { value: 'activity', label: 'Trải nghiệm' },
];

const minRatingOptions: Array<{ value: number; label: string }> = [
  { value: 0, label: 'Mọi mức điểm' },
  { value: 4, label: 'Từ 4.0 trở lên' },
  { value: 4.5, label: 'Từ 4.5 trở lên' },
];

const priceFilterOptions: Array<{ value: PriceFilter; label: string }> = [
  { value: 'all', label: 'Mọi mức giá' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'budget', label: 'Dưới 100K' },
  { value: 'mid', label: '100K - 300K' },
  { value: 'premium', label: 'Trên 300K' },
];

const sortFilterOptions: Array<{ value: SortFilter; label: string }> = [
  { value: 'relevance', label: 'Phù hợp nhất' },
  { value: 'rating', label: 'Đánh giá cao nhất' },
  { value: 'priceAsc', label: 'Giá thấp đến cao' },
  { value: 'priceDesc', label: 'Giá cao đến thấp' },
];
const MAX_NEARBY_RECOMMENDATIONS = 20;
const DISCOVERY_DRAG_TYPE = 'application/vnd.vietjourney.location-id';

// Format VND currency
const formatVND = (amount: number) => {
  if (amount === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
  }).format(amount).replace(/\s?VND$/, ' VND');
};

const toRad = (deg: number) => (deg * Math.PI) / 180;

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const earthKm = 6371;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

function backendRowKey(row: {
  id?: string | null;
  category?: string | null;
  name?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}) {
  const rawId = typeof row.id === 'string' ? row.id.trim() : '';
  if (rawId) return `${row.category ?? 'place'}:${rawId}`;
  const category = (row.category ?? 'place').trim().toLowerCase();
  const name = (row.name ?? '').trim().toLowerCase();
  const address = (row.address ?? '').trim().toLowerCase();
  const lat = Number.isFinite(row.latitude as number) ? Number(row.latitude).toFixed(5) : 'na';
  const lng = Number.isFinite(row.longitude as number) ? Number(row.longitude).toFixed(5) : 'na';
  return `${category}:${name}:${address}:${lat}:${lng}`;
}

const minutesToHHmm = (minutes: number) => {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const dayLabel = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });

export default function Discovery() {
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [searchQuery, setSearchQuery] = useLocalStorageState('vj:discovery:search-query', '');
  const [categoryFilter, setCategoryFilter] = useLocalStorageState<CategoryFilter>('vj:discovery:category-filter', 'all');
  const [districtFilter, setDistrictFilter] = useLocalStorageState<string>('vj:discovery:district-filter', 'all');
  const [minRatingFilter, setMinRatingFilter] = useLocalStorageState<number>('vj:discovery:min-rating-filter', 0);
  const [priceFilter, setPriceFilter] = useLocalStorageState<PriceFilter>('vj:discovery:price-filter', 'all');
  const [selectedTagGroup, setSelectedTagGroup] = useLocalStorageState<string>('vj:discovery:selected-tag-group', 'all');
  const [selectedTagValues, setSelectedTagValues] = useLocalStorageState<string[]>('vj:discovery:selected-tag-values', []);
  const [sortFilter, setSortFilter] = useLocalStorageState<SortFilter>('vj:discovery:sort-filter', 'relevance');
  const [selectedLocationId, setSelectedLocationId] = useLocalStorageState<string | null>('vj:discovery:selected-location-id', null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLocation, setAddLocation] = useState<Location | null>(null);
  const [addDefaults, setAddDefaults] = useState<{
    date: string;
    startTime: string;
    endTime: string;
  } | null>(null);
  const [draggedLocationId, setDraggedLocationId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    date: string;
    startTime: string;
    endTime: string;
    topPct: number;
  } | null>(null);
  const [recommendedLocations, setRecommendedLocations] = useState<Location[] | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);
  /** When personalized fetch fails or returns no rows, we fall back to mock data. */
  const [recoFallback, setRecoFallback] = useState<'none' | 'error' | 'empty'>('none');
  const [recoErrorMessage, setRecoErrorMessage] = useState<string | null>(null);
  const [recoRetryKey, setRecoRetryKey] = useState(0);
  /** Public places catalog from `POST /api/v1/places/filter`. */
  const [catalogLocations, setCatalogLocations] = useState<Location[]>([]);
  const [catalogAttempted, setCatalogAttempted] = useState(false);
  const [catalogUniverse, setCatalogUniverse] = useState<Location[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetryKey, setCatalogRetryKey] = useState(0);
  const [realTimelines, setRealTimelines] = useState<any[]>([]);
  const [timetableItems, setTimetableItems] = useState<TimelineItem[]>([]);
  const [labelByLocationId, setLabelByLocationId] = useState<Record<string, string>>({});
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const listCardsRef = useRef<HTMLDivElement>(null);
  
  const [currentTripId, setCurrentTripId] = useLocalStorageState('vj:discovery:current-trip-id', () => getLastTripId('trip-1'));

  useEffect(() => {
    const loadTimelines = async () => {
      const token = getStoredToken();
      if (isAuthenticated && token) {
        try {
          const timelines = await getMyTimelines(token);
          setRealTimelines(timelines || []);
          if (currentTripId === 'trip-1' && timelines && timelines.length > 0) {
            // Auto-select the first real timeline for the user if they are on mock
            setCurrentTripId(timelines[0].id);
            setLastTripId(timelines[0].id);
          }
        } catch (err) {
          console.error('[Discovery] Failed to fetch timelines:', err);
        }
      }
    };
    loadTimelines();
  }, [isAuthenticated]);

  const tripId = currentTripId;
  const isMockTrip = tripId === 'trip-1'; 
  const trip = useMemo(() => {
    if (!isMockTrip && realTimelines.length > 0) {
      const found = realTimelines.find(t => t.id === tripId);
      if (found) return { ...found, destination: found.destination || 'Việt Nam', participants: [] };
    }
    return mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  }, [tripId, isMockTrip, realTimelines]);
  const tripUsers = mockUsers.filter((u) => trip.participants.includes(u.id));
  const effectiveCenter: [number, number] = userCenter ?? HCMC_CENTER;

  const tripDates = useMemo(() => {
    const dates = eachTripDay(trip.startDate, trip.endDate);
    if (dates.length) return dates;
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const next = new Date(today);
      next.setDate(today.getDate() + offset);
      return next.toISOString().slice(0, 10);
    });
  }, [trip.endDate, trip.startDate]);

  const [visibleDates, setVisibleDates] = useLocalStorageState<string[]>('vj:discovery:visible-dates', []);

  useEffect(() => {
    setVisibleDates((prev) => {
      const valid = prev.filter((date) => tripDates.includes(date));
      return valid.length ? valid : tripDates.slice(0, Math.min(3, tripDates.length));
    });
  }, [tripDates]);

  const timetableLayouts = useMemo(() => layoutsByDate(timetableItems), [timetableItems]);

  const getTimetableLabel = (block: TimetableBlock) =>
    labelByLocationId[block.locationId] ||
    mockLocations.find((location) => location.id === block.locationId)?.name ||
    'Hoạt động';

  const baseLocations = useMemo(() => {
    if (catalogAttempted) return catalogLocations;
    return recommendedLocations ?? mockLocations;
  }, [catalogAttempted, catalogLocations, recommendedLocations]);
  const optionSourceLocations =
    catalogUniverse ?? catalogLocations ?? recommendedLocations ?? mockLocations;

  const districtOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const location of optionSourceLocations) {
      const district = location.recommendation?.district?.trim();
      if (district) unique.add(district);
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [optionSourceLocations]);

  const tagGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    for (const location of optionSourceLocations) {
      for (const group of Object.keys(location.recommendation?.tags ?? {})) {
        if (group.trim()) groups.add(group.trim());
      }
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [optionSourceLocations]);

  const availableTagValues = useMemo(() => {
    if (selectedTagGroup === 'all') return [];
    const counter = new Map<string, { label: string; count: number }>();
    for (const location of optionSourceLocations) {
      const values = location.recommendation?.tags?.[selectedTagGroup] ?? [];
      for (const raw of values) {
        const value = raw.trim();
        if (!value) continue;
        const key = value.toLowerCase();
        const current = counter.get(key);
        if (current) {
          current.count += 1;
        } else {
          counter.set(key, { label: value, count: 1 });
        }
      }
    }
    return Array.from(counter.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'vi'))
      .slice(0, 18);
  }, [optionSourceLocations, selectedTagGroup]);

  const activeFilterCount =
    Number(categoryFilter !== 'all') +
    Number(districtFilter !== 'all') +
    Number(minRatingFilter > 0) +
    Number(priceFilter !== 'all') +
    Number(selectedTagGroup !== 'all') +
    selectedTagValues.length;

  const filteredLocations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const searched = q === ''
      ? baseLocations
      : baseLocations.filter((location) => locationSearchText(location).includes(q));
    // Backend handles category/district/rating/price range/tag filters.
    // Keep "free" as strict client-side check because backend range overlap can include non-zero prices.
    const filtered = priceFilter === 'free'
      ? searched.filter((location) => location.price === 0)
      : searched;

    switch (sortFilter) {
      case 'rating':
        return filtered.slice().sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name, 'vi'));
      case 'priceAsc':
        return filtered.slice().sort((a, b) => a.price - b.price || b.rating - a.rating);
      case 'priceDesc':
        return filtered.slice().sort((a, b) => b.price - a.price || b.rating - a.rating);
      default:
        return filtered.slice().sort((a, b) => {
          const da = distanceKm(a.lat, a.lng, effectiveCenter[0], effectiveCenter[1]);
          const db = distanceKm(b.lat, b.lng, effectiveCenter[0], effectiveCenter[1]);
          if (Math.abs(da - db) > 0.01) return da - db;
          return b.rating - a.rating || a.name.localeCompare(b.name, 'vi');
        });
    }
  }, [
    baseLocations,
    searchQuery,
    priceFilter,
    sortFilter,
    effectiveCenter,
  ]);

  const nearbyRecommendationIds = useMemo(() => {
    return new Set(
      filteredLocations
        .slice()
        .sort(
          (a, b) =>
            distanceKm(a.lat, a.lng, effectiveCenter[0], effectiveCenter[1]) -
            distanceKm(b.lat, b.lng, effectiveCenter[0], effectiveCenter[1])
        )
        .slice(0, MAX_NEARBY_RECOMMENDATIONS)
        .map((loc) => loc.id)
    );
  }, [filteredLocations, effectiveCenter]);

  const draggedLocation = useMemo(() => {
    if (!draggedLocationId) return null;
    return (
      filteredLocations.find((location) => location.id === draggedLocationId) ??
      baseLocations.find((location) => location.id === draggedLocationId) ??
      null
    );
  }, [baseLocations, draggedLocationId, filteredLocations]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsStatus('unsupported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCenter([pos.coords.latitude, pos.coords.longitude]);
        setGpsStatus('granted');
      },
      () => {
        setGpsStatus('denied');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 120000 }
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const size = 100;
        const firstPage = await filterPlaces({ page: 0, size });
        if (cancelled) return;
        const rows = [...(firstPage.data ?? [])];
        const totalPages = Math.max(1, firstPage.totalPages ?? 1);
        for (let page = 1; page < totalPages; page++) {
          const nextPage = await filterPlaces({ page, size });
          if (cancelled) return;
          rows.push(...(nextPage.data ?? []));
        }
        const uniqueRows = Array.from(
          new Map(rows.map((row) => [backendRowKey(row), row])).values()
        );
        if (!cancelled) {
          setCatalogUniverse(uniqueRows.map(placeApiRowToLocation));
        }
      } catch {
        // Keep existing option source if universe fetch fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogRetryKey]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void (async () => {
      try {
        const size = 100;
        const buildBody = (page: number): Parameters<typeof filterPlaces>[0] => {
          const body: Parameters<typeof filterPlaces>[0] = { page, size };
          if (categoryFilter !== 'all') body.category = categoryFilter;
          if (districtFilter !== 'all') body.district = districtFilter;
          if (minRatingFilter > 0) body.minRating = minRatingFilter;

          if (priceFilter === 'budget') {
            body.minPrice = 1;
            body.maxPrice = 100_000;
          } else if (priceFilter === 'free') {
            body.minPrice = 0;
            body.maxPrice = 0;
          } else if (priceFilter === 'mid') {
            body.minPrice = 100_000;
            body.maxPrice = 300_000;
          } else if (priceFilter === 'premium') {
            body.minPrice = 300_000;
          }

          if (selectedTagGroup !== 'all' && selectedTagValues.length > 0) {
            body.tags = { [selectedTagGroup]: selectedTagValues };
          }
          return body;
        };

        const firstPage = await filterPlaces(buildBody(0));
        if (cancelled) return;
        const rows = [...(firstPage.data ?? [])];

        const totalPages = Math.max(1, firstPage.totalPages ?? 1);
        for (let page = 1; page < totalPages; page++) {
          const nextPage = await filterPlaces(buildBody(page));
          if (cancelled) return;
          rows.push(...(nextPage.data ?? []));
        }

        const uniqueRows = Array.from(
          new Map(rows.map((row) => [backendRowKey(row), row])).values()
        );
        if (!uniqueRows.length) {
          setCatalogLocations([]);
          return;
        }
        const mapped = uniqueRows.map(placeApiRowToLocation);
        setCatalogLocations(mapped);
      } catch (e) {
        if (!cancelled) {
          setCatalogLocations([]);
          setCatalogError(
            e instanceof ApiError ? e.message : 'Không tải được danh sách địa điểm từ máy chủ.'
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
          setCatalogAttempted(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    catalogRetryKey,
    categoryFilter,
    districtFilter,
    minRatingFilter,
    priceFilter,
    selectedTagGroup,
    selectedTagValues,
  ]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRecommendedLocations(null);
      setRecoLoading(false);
      setRecoFallback('none');
      setRecoErrorMessage(null);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      setRecommendedLocations(null);
      setRecoLoading(false);
      setRecoFallback('none');
      return;
    }

    let cancelled = false;
    setRecoFallback('none');
    setRecoErrorMessage(null);
    setRecoLoading(true);

    void (async () => {
      try {
        const rows = await getRecommendedPlaces(token, 40);
        if (cancelled) return;
        if (!rows?.length) {
          setRecommendedLocations(null);
          setRecoFallback('empty');
          return;
        }
        setRecommendedLocations(rows.map(recommendedPlaceToLocation));
      } catch (e) {
        if (!cancelled) {
          setRecommendedLocations(null);
          setRecoFallback('error');
          setRecoErrorMessage(
            e instanceof ApiError ? e.message : 'Không kết nối được máy chủ gợi ý.'
          );
        }
      } finally {
        if (!cancelled) setRecoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, recoRetryKey]);

  useEffect(() => {
    if (!isAuthenticated || !selectedLocationId) return;
    const loc = filteredLocations.find((l) => l.id === selectedLocationId);
    if (!loc) return;
    const handle = window.setTimeout(() => {
      enqueueRecommendationInteraction({
        ...buildInteractionBase(loc),
        eventType: 'DWELL',
      });
    }, 3500);
    return () => window.clearTimeout(handle);
  }, [isAuthenticated, selectedLocationId, filteredLocations]);

  useEffect(() => {
    if (!isAuthenticated || !listCardsRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting || en.intersectionRatio < 0.42) continue;
          const id = (en.target as HTMLElement).dataset.placeId;
          if (!id) continue;
          const loc = filteredLocations.find((l) => l.id === id);
          if (!loc) continue;
          enqueueRecommendationInteraction({
            ...buildInteractionBase(loc),
            eventType: 'VIEWPORT',
          });
        }
      },
      { threshold: [0.42, 0.6] }
    );
    listCardsRef.current.querySelectorAll<HTMLElement>('[data-place-id]').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isAuthenticated, filteredLocations]);

  useEffect(() => {
    if (districtFilter === 'all') return;
    if (!districtOptions.includes(districtFilter)) {
      setDistrictFilter('all');
    }
  }, [districtFilter, districtOptions]);

  useEffect(() => {
    if (selectedTagGroup === 'all') {
      if (selectedTagValues.length > 0) setSelectedTagValues([]);
      return;
    }
    if (!tagGroupOptions.includes(selectedTagGroup)) {
      setSelectedTagGroup('all');
      setSelectedTagValues([]);
      return;
    }
    const allow = new Set(availableTagValues.map((x) => x.label.toLowerCase()));
    setSelectedTagValues((prev) => prev.filter((x) => allow.has(x.toLowerCase())));
  }, [selectedTagGroup, selectedTagValues.length, availableTagValues, tagGroupOptions]);

  useEffect(() => {
    let cancelled = false;
    const token = getStoredToken();

    void (async () => {
      if (!tripId || tripId === 'undefined') {
        setTimetableItems([]);
        setLabelByLocationId({});
        return;
      }

      if (!isMockTrip && token) {
        try {
          const detail = await getTimelineDetail(tripId, token);
          if (cancelled) return;
          const mapped = mapApiTimelineToTimetable(detail);
          setTimetableItems(mapped.items);
          setLabelByLocationId(mapped.labelByLocationId);
          return;
        } catch (error) {
          console.error('[Discovery] Failed to load timetable preview:', error);
        }
      }

      if (!cancelled) {
        const stored = loadTripData(tripId);
        const baseItems = stored?.timeline ?? mockTimeline;
        setTimetableItems(baseItems);
        setLabelByLocationId(
          Object.fromEntries(
            mockLocations.map((location) => [location.id, location.name])
          )
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMockTrip, tripId]);

  const openAdd = (
    location: Location,
    defaults?: { date: string; startTime: string; endTime: string }
  ) => {
    setAddLocation(location);
    setAddDefaults(defaults ?? {
      date: visibleDates[0] ?? tripDates[0] ?? new Date().toISOString().slice(0, 10),
      startTime: '09:00',
      endTime: '10:00',
    });
    setAddOpen(true);
  };

  const toggleVisibleDate = (date: string) => {
    setVisibleDates((prev) => {
      if (prev.includes(date)) {
        return prev.length > 1 ? prev.filter((item) => item !== date) : prev;
      }
      return [...prev, date].sort();
    });
  };

  const getDropDefaults = (date: string, target: HTMLElement, clientY: number) => {
    const rect = target.getBoundingClientRect();
    const percent = clamp((clientY - rect.top) / rect.height, 0, 1);
    const rawMinutes = TIMETABLE_DAY_START_HOUR * 60 + percent * daySpanMinutes();
    const startMinutes = clamp(
      Math.round(rawMinutes / 15) * 15,
      TIMETABLE_DAY_START_HOUR * 60,
      TIMETABLE_DAY_END_HOUR * 60 - 30
    );
    const endMinutes = Math.min(startMinutes + 90, TIMETABLE_DAY_END_HOUR * 60);
    return {
      date,
      startTime: minutesToHHmm(startMinutes),
      endTime: minutesToHHmm(endMinutes),
      topPct: ((startMinutes - TIMETABLE_DAY_START_HOUR * 60) / daySpanMinutes()) * 100,
    };
  };

  const handleTimetableDrop = (date: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const locationId =
      event.dataTransfer.getData(DISCOVERY_DRAG_TYPE) ||
      event.dataTransfer.getData('text/plain');
    const location = filteredLocations.find((item) => item.id === locationId) ||
      baseLocations.find((item) => item.id === locationId);
    if (!location) return;

    const defaults = getDropDefaults(date, event.currentTarget, event.clientY);
    setDropPreview(null);
    setDraggedLocationId(null);
    openAdd(location, defaults);
  };

  const clearAllFilters = () => {
    setCategoryFilter('all');
    setDistrictFilter('all');
    setMinRatingFilter(0);
    setPriceFilter('all');
    setSelectedTagGroup('all');
    setSelectedTagValues([]);
    setSortFilter('relevance');
  };

  const toggleTag = (tag: string) => {
    setSelectedTagValues((prev) => {
      const key = tag.toLowerCase();
      const exists = prev.some((x) => x.toLowerCase() === key);
      if (exists) return prev.filter((x) => x.toLowerCase() !== key);
      return [...prev, tag];
    });
  };

  return (
    <div className="h-full flex flex-col xl:flex-row bg-[var(--vj-bg)] min-h-0 gap-[var(--vj-layout-gap)] px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)]">
      {/* Left Panel - Search & Filters & List */}
      <div className="w-full xl:w-[var(--vj-panel-max)] xl:max-w-[var(--vj-panel-max)] xl:shrink-0 flex flex-col min-h-0 flex-1 xl:flex-none xl:max-h-full bg-[var(--vj-surface)]/95 backdrop-blur-3xl border border-[var(--vj-border)] rounded-3xl shadow-[var(--vj-shadow-premium)] relative z-[1050] transition-all duration-700 ease-[var(--vj-ease-out-expo)]">
        {/* Header */}
        <div className="p-[var(--vj-inset)] border-b border-white/5 bg-gradient-to-br from-[var(--vj-primary)]/90 via-[var(--vj-primary-2)]/80 to-[#0f4b68]/70 backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-6">
            <span className="text-4xl drop-shadow-md">🇻🇳</span>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm">Khám Phá Việt Nam</h1>
              <p className="text-white/70 text-sm font-medium mt-1">Tìm kiếm trải nghiệm phù hợp với gu của bạn</p>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[11px] font-bold text-white/90 uppercase tracking-wider">
                  {trip.destination}
                </span>
              </div>
              {catalogLoading && (
                <p className="mt-2 text-xs font-bold text-white/60 animate-pulse">Đang đồng bộ dữ liệu…</p>
              )}
              {!catalogLoading && catalogLocations.length > 0 && !recommendedLocations && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-white/90 border border-white/10">
                  <MapPin className="size-3.5 text-emerald-400" />
                  Dữ liệu thực tế từ API
                </p>
              )}
              {isAuthenticated && !recoLoading && recommendedLocations && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400/20 to-orange-400/20 px-4 py-1.5 text-xs font-bold text-white border border-amber-400/20">
                  <Sparkles className="size-3.5 text-amber-400" />
                  Gợi ý dành riêng cho bạn
                </p>
              )}
              {isAuthenticated && !recoLoading && recoFallback === 'empty' && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-white">
                  <AlertCircle className="size-3.5" />
                  Chưa có gợi ý — đang xem danh mục máy chủ hoặc mẫu TP.HCM
                </p>
              )}
              {isAuthenticated && !recoLoading && recoFallback === 'error' && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-red-500/25 px-3 py-1 text-xs font-semibold text-white">
                  <AlertCircle className="size-3.5" />
                  Lỗi tải gợi ý — đang xem danh mục máy chủ hoặc mẫu
                </p>
              )}
            </div>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên, hoạt động, không khí..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-full border-slate-300/80 bg-white shadow-sm"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Xóa từ khóa tìm kiếm"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable content: Filters + Results + List */}
        <ScrollArea className="flex-1 min-h-0">
          {isAuthenticated && !recoLoading && recoFallback === 'error' && (
            <div className="p-[var(--vj-inset)] pb-0">
              <Alert variant="destructive" className="border-red-200 bg-red-50/90 text-red-900 [&>svg]:text-red-600">
                <AlertCircle />
                <AlertTitle>Không tải được gợi ý cá nhân</AlertTitle>
                <AlertDescription className="text-red-800/90">
                  <p>{recoErrorMessage ?? 'Vui lòng kiểm tra kết nối hoặc máy chủ backend.'}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-red-300 bg-white text-red-900 hover:bg-red-100"
                    onClick={() => setRecoRetryKey((k) => k + 1)}
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {isAuthenticated && !recoLoading && recoFallback === 'empty' && (
            <div className="p-[var(--vj-inset)] pb-0">
              <Alert className="border-amber-200 bg-amber-50/90 text-amber-950">
                <AlertCircle className="text-amber-600" />
                <AlertTitle>Chưa có đủ dữ liệu gợi ý</AlertTitle>
                <AlertDescription className="text-amber-900/85">
                  Hệ thống chưa trả về địa điểm gợi ý. Bạn vẫn có thể xem địa điểm từ máy chủ hoặc bộ dữ liệu mẫu TP.HCM.
                </AlertDescription>
              </Alert>
            </div>
          )}
          {!catalogLoading && catalogError && (
            <div className="p-[var(--vj-inset)] pb-0">
              <Alert className="border-slate-300 bg-slate-50">
                <AlertCircle className="text-slate-600" />
                <AlertTitle>Không lấy được danh mục địa điểm từ backend</AlertTitle>
                <AlertDescription className="text-slate-700">
                  <p>{catalogError}</p>
                  <p className="text-xs mt-1.5 text-slate-600">
                    Đảm bảo backend chạy và CSDL có các bảng phục vụ ô lọc (ví dụ <code className="text-xs">places_food</code>,{' '}
                    <code className="text-xs">places_drink</code>, <code className="text-xs">places_activity</code>). Hiện tại đang hiển thị địa điểm mẫu TP.HCM.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-slate-300"
                    onClick={() => setCatalogRetryKey((k) => k + 1)}
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Tải lại danh mục
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          )}
          {/* Filters */}
          <div className="border-b border-slate-200 bg-white/80 p-[var(--vj-inset)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                <SlidersHorizontal className="size-3.5 shrink-0" />
                Bộ lọc theo dữ liệu
              </div>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 rounded-full px-3 text-xs text-slate-600 hover:text-slate-900"
                  onClick={clearAllFilters}
                >
                  Xóa bộ lọc ({activeFilterCount})
                </Button>
              )}
            </div>

            <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Loại địa điểm</p>
              <div className="flex flex-wrap gap-2">
                {categoryFilterOptions.map((filter) => (
                  <Button
                    key={filter.value}
                    variant={categoryFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoryFilter(filter.value)}
                    className={`rounded-full ${
                      categoryFilter === filter.value
                        ? 'bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]'
                        : 'border-slate-300'
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Quận / khu vực</p>
              <div>
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
                >
                  <option value="all">Tất cả khu vực</option>
                  {districtOptions.map((district) => (
                    <option key={district} value={district}>
                      {district}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Đánh giá</p>
                <select
                  value={String(minRatingFilter)}
                  onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
                >
                  {minRatingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2.5">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Mức giá</p>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
                >
                  {priceFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Bộ tag theo nhóm</p>
              <select
                value={selectedTagGroup}
                onChange={(e) => {
                  setSelectedTagGroup(e.target.value);
                  setSelectedTagValues([]);
                }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm"
              >
                <option value="all">Không lọc theo tag</option>
                {tagGroupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedTagGroup !== 'all' && availableTagValues.length === 0 ? (
                  <span className="w-full rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    Nhóm tag này chưa có dữ liệu khả dụng.
                  </span>
                ) : null}
                {availableTagValues.map((item) => (
                  <Button
                    key={item.label}
                    variant={selectedTagValues.some((t) => t.toLowerCase() === item.label.toLowerCase()) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTag(item.label)}
                    className={`h-8 rounded-full px-3 ${
                      selectedTagValues.some((t) => t.toLowerCase() === item.label.toLowerCase())
                        ? 'bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]'
                        : 'border-slate-200'
                    }`}
                  >
                    {item.label}
                    <span className="ml-1.5 text-[10px] opacity-75">{item.count}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Sắp xếp</p>
              <div className="flex flex-wrap gap-2">
                {sortFilterOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={sortFilter === option.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSortFilter(option.value)}
                    className={`rounded-full ${
                      sortFilter === option.value
                        ? 'bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]'
                        : 'border-slate-300'
                    }`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="px-[var(--vj-inset)] py-3 bg-slate-100 border-b border-slate-200">
            <p className="text-sm text-slate-600 flex items-center justify-between gap-2">
              <span>
                <span className="font-bold text-[var(--vj-primary)]">{filteredLocations.length}</span> địa điểm được tìm thấy
              </span>
              {(recoLoading && isAuthenticated) || catalogLoading ? (
                <span className="ml-2 text-xs font-medium text-slate-500">Đồng bộ dữ liệu…</span>
              ) : null}
            </p>
            {!catalogLoading && filteredLocations.length > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {gpsStatus === 'granted' ? 'Gợi ý gần bạn' : 'Gợi ý gần trung tâm'}: {Math.min(MAX_NEARBY_RECOMMENDATIONS, filteredLocations.length)} địa điểm
              </p>
            )}
            {gpsStatus === 'denied' && (
              <p className="mt-1 text-[11px] text-amber-700">Bạn đã tắt quyền vị trí, hệ thống dùng vị trí mặc định TP.HCM.</p>
            )}
          </div>

          {/* Location Cards List */}
          <div ref={listCardsRef} className="p-[var(--vj-inset)] space-y-[var(--vj-stack-gap)]">
            {filteredLocations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">Không có địa điểm khớp bộ lọc</p>
                <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
                  Thử nới lỏng tag, mức giá, điểm đánh giá hoặc xóa từ khóa tìm kiếm.
                </p>
              </div>
            ) : null}
            {filteredLocations.map((location) => (
              <Card
                key={location.id}
                data-place-id={location.id}
                draggable
                className={`group p-4 transition-all cursor-grab active:cursor-grabbing border ${
                  selectedLocationId === location.id
                    ? 'border-[var(--vj-accent)] shadow-lg ring-2 ring-[var(--vj-accent)]/20'
                    : 'border-slate-200 hover:border-[var(--vj-accent)]/50'
                } ${
                  draggedLocationId === location.id
                    ? 'scale-[0.985] border-[var(--vj-accent)] bg-orange-50/70 opacity-75 shadow-2xl ring-2 ring-[var(--vj-accent)]/30'
                    : 'hover:-translate-y-0.5 hover:shadow-xl'
                }`}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DISCOVERY_DRAG_TYPE, location.id);
                  event.dataTransfer.setData('text/plain', location.id);
                  event.dataTransfer.effectAllowed = 'copy';
                  setDraggedLocationId(location.id);
                  setSelectedLocationId(location.id);
                  setDropPreview(null);
                }}
                onDragEnd={() => {
                  setDraggedLocationId(null);
                  setDropPreview(null);
                }}
                onClick={() => {
                  setSelectedLocationId(location.id);
                  if (isAuthenticated) {
                    enqueueRecommendationInteraction({
                      ...buildInteractionBase(location),
                      eventType: 'CLICK',
                    });
                  }
                }}
              >
                <div className="flex gap-3 sm:gap-4">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="h-24 w-24 shrink-0 rounded-xl object-cover shadow-sm sm:h-28 sm:w-28"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onError={onLocationImageError}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold leading-snug text-[var(--vj-primary)] sm:text-lg">
                        {location.name}
                      </h3>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 transition group-hover:bg-orange-100 group-hover:text-[var(--vj-accent)]">
                          <GripVertical className="h-3 w-3" />
                          Kéo
                        </span>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-sm font-semibold text-slate-700">{location.rating}</span>
                        </div>
                      </div>
                    </div>
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {location.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {nearbyRecommendationIds.has(location.id) && (
                        <Badge className="border border-amber-200 bg-amber-100 text-[11px] text-amber-800 hover:bg-amber-200">
                          Gợi ý gần bạn
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-600">
                        {location.weather === 'indoor' ? 'Trong nhà' : location.weather === 'outdoor' ? 'Ngoài trời' : 'Linh hoạt'}
                      </Badge>
                      <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-600">
                        {location.vibe === 'quiet' ? 'Yên tĩnh' : location.vibe === 'vibrant' ? 'Sôi động' : 'Cân bằng'}
                      </Badge>
                      {location.recommendation?.district && (
                        <Badge variant="outline" className="border-slate-200 text-[11px] text-slate-600">
                          {location.recommendation.district}
                        </Badge>
                      )}
                    </div>
                    {location.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {location.tags.slice(0, 4).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="rounded-full border-0 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    <div className="mt-0.5 flex flex-col gap-2 border-t border-slate-100 pt-2.5 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-sm font-bold text-[var(--vj-accent)]">{formatVND(location.price)}</span>
                      <Button
                        size="sm"
                        className="h-9 w-full shrink-0 rounded-full bg-[var(--vj-accent)] px-4 text-white hover:bg-[var(--vj-accent-2)] sm:w-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          openAdd(location);
                        }}
                      >
                        Thêm lịch trình
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Timetable Planner */}
      <div className={`flex min-h-[min(42vh,22rem)] flex-1 flex-col overflow-hidden rounded-[1.75rem] border bg-white shadow-[0_24px_64px_rgba(15,23,42,0.08)] transition-all xl:min-h-0 ${
        draggedLocation
          ? 'border-[var(--vj-accent)] ring-4 ring-[var(--vj-accent)]/15'
          : 'border-slate-200/90'
      }`}>
        <div className={`border-b border-slate-200/90 p-[var(--vj-inset)] transition-colors ${
          draggedLocation ? 'bg-gradient-to-r from-orange-50/90 via-white to-emerald-50/80' : 'bg-gradient-to-br from-white to-slate-50/80'
        }`}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[var(--vj-primary)]/10 px-3 py-1 text-xs font-bold text-[var(--vj-primary)]">
                <CalendarRange className="h-3.5 w-3.5" />
                {draggedLocation ? 'Sẵn sàng thả' : 'Lịch nháp'}
              </div>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--vj-primary)]">
                {draggedLocation ? `Đang kéo: ${draggedLocation.name}` : 'Kéo địa điểm vào thời khoá biểu'}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {dropPreview
                  ? `Thả để lên lịch ${dropPreview.startTime} - ${dropPreview.endTime} ngày ${dropPreview.date}.`
                  : 'Chọn một hoặc nhiều ngày, kéo thẻ địa điểm từ danh sách bên trái rồi thả vào khung giờ mong muốn.'}
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-xs transition-colors ${
              draggedLocation
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-orange-200 bg-orange-50 text-orange-900'
            }`}>
              <p className="font-bold">{draggedLocation ? 'Thả vào cột ngày' : 'Mẹo nhanh'}</p>
              <p className="mt-1">
                {draggedLocation
                  ? 'Đường màu cam cho biết khung giờ sẽ được điền vào hộp lên lịch.'
                  : 'Sau khi thả, hộp lên lịch sẽ mở sẵn ngày và giờ để bạn kiểm tra trước khi lưu.'}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {tripDates.map((date) => {
              const active = visibleDates.includes(date);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => toggleVisibleDate(date)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? 'border-[var(--vj-primary)] bg-[var(--vj-primary)] text-white shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-[var(--vj-primary)]/40'
                  }`}
                  aria-pressed={active}
                >
                  {dayLabel(date)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-slate-50/30">
          <div className="flex min-w-fit">
            <div className="sticky left-0 z-20 w-[3.5rem] shrink-0 border-r border-slate-200/90 bg-gradient-to-b from-slate-50 to-white backdrop-blur-sm">
              <div className="sticky top-0 z-30 flex h-12 items-end justify-center border-b border-slate-200 bg-slate-100/90 pb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Giờ</span>
              </div>
              <div
                className="relative"
                style={{ height: (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * PX_PER_HOUR }}
              >
                {Array.from(
                  { length: TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR },
                  (_, index) => TIMETABLE_DAY_START_HOUR + index
                ).map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-slate-200/90 pr-2 text-right text-xs font-medium tabular-nums text-slate-500"
                    style={{
                      top: ((hour - TIMETABLE_DAY_START_HOUR) / (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR)) * 100 + '%',
                      height: PX_PER_HOUR,
                    }}
                  >
                    {String(hour).padStart(2, '0')}:00
                  </div>
                ))}
              </div>
            </div>

            {visibleDates.map((date) => {
              const blocks = timetableLayouts.get(date) ?? [];
              const isPreviewDate = dropPreview?.date === date;
              return (
                <div
                  key={date}
                  className={`w-[min(72vw,13.5rem)] shrink-0 border-r transition-colors last:border-r-0 sm:w-48 lg:w-56 ${
                    isPreviewDate ? 'border-r-orange-200/80 bg-orange-50/40' : 'border-slate-200/80 bg-white'
                  }`}
                >
                  <div className={`sticky top-0 z-10 flex h-12 flex-col justify-center border-b px-3 transition-colors ${
                    isPreviewDate
                      ? 'border-orange-200 bg-gradient-to-br from-orange-100 to-orange-50'
                      : 'border-slate-200 bg-gradient-to-br from-[color-mix(in_oklab,var(--vj-primary)_10%,white)] to-white'
                  }`}>
                    <span className="text-xs font-extrabold capitalize leading-tight text-[var(--vj-primary)]">
                      {dayLabel(date)}
                    </span>
                    <span className="text-[10px] tabular-nums text-slate-500">
                      {isPreviewDate ? `${dropPreview.startTime} - ${dropPreview.endTime}` : date}
                    </span>
                  </div>
                  <div
                    className={`relative transition-colors ${
                      draggedLocation
                        ? isPreviewDate
                          ? 'bg-orange-50/50'
                          : 'bg-emerald-50/25 hover:bg-emerald-50/50'
                        : 'bg-white'
                    }`}
                    style={{ height: (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR) * PX_PER_HOUR }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'copy';
                      const nextPreview = getDropDefaults(date, event.currentTarget, event.clientY);
                      setDropPreview((prev) =>
                        prev &&
                        prev.date === nextPreview.date &&
                        prev.startTime === nextPreview.startTime &&
                        prev.endTime === nextPreview.endTime
                          ? prev
                          : nextPreview
                      );
                    }}
                    onDragLeave={(event) => {
                      const nextTarget = event.relatedTarget as Node | null;
                      if (nextTarget && event.currentTarget.contains(nextTarget)) return;
                      setDropPreview((prev) => (prev?.date === date ? null : prev));
                    }}
                    onDrop={(event) => handleTimetableDrop(date, event)}
                  >
                    {Array.from(
                      { length: TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR },
                      (_, index) => TIMETABLE_DAY_START_HOUR + index
                    ).map((hour) => (
                      <div
                        key={hour}
                        className="absolute left-0 right-0 pointer-events-none border-t border-slate-100"
                        style={{
                          top: ((hour - TIMETABLE_DAY_START_HOUR) / (TIMETABLE_DAY_END_HOUR - TIMETABLE_DAY_START_HOUR)) * 100 + '%',
                        }}
                      />
                    ))}

                    {blocks.length === 0 ? (
                      <div className={`absolute inset-x-4 top-8 rounded-2xl border border-dashed p-4 text-center text-xs font-semibold transition-colors ${
                        draggedLocation
                          ? 'border-emerald-300 bg-emerald-50/80 text-emerald-800'
                          : 'border-slate-300 bg-slate-50/80 text-slate-500'
                      }`}>
                        {draggedLocation ? 'Thả để tạo hoạt động đầu tiên' : 'Thả địa điểm vào đây'}
                      </div>
                    ) : null}

                    {isPreviewDate ? (
                      <div
                        className="pointer-events-none absolute left-2 right-2 z-20"
                        style={{ top: `${dropPreview.topPct}%` }}
                      >
                        <div className="flex -translate-y-1/2 items-center gap-2">
                          <span className="rounded-full bg-[var(--vj-accent)] px-2 py-1 text-[10px] font-black tabular-nums text-white shadow-lg">
                            {dropPreview.startTime} - {dropPreview.endTime}
                          </span>
                          <span className="h-0.5 flex-1 rounded-full bg-[var(--vj-accent)] shadow-[0_0_0_3px_rgba(255,107,53,0.15)]" />
                        </div>
                      </div>
                    ) : null}

                    {blocks.map((block) => {
                      const topPct = ((block.startMin - TIMETABLE_DAY_START_HOUR * 60) / daySpanMinutes()) * 100;
                      const heightPct = ((block.endMin - block.startMin) / daySpanMinutes()) * 100;
                      const laneWidth = 100 / block.laneCount;
                      const leftPct = block.lane * laneWidth;
                      return (
                        <button
                          key={block.id}
                          type="button"
                          className="absolute overflow-hidden rounded-xl border border-[var(--vj-accent)]/25 bg-white px-2 py-1.5 text-left shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition hover:-translate-y-px hover:border-[var(--vj-accent)]/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vj-accent)]"
                          style={{
                            top: `${topPct}%`,
                            height: `max(${heightPct}%, 36px)`,
                            left: `calc(${leftPct}% + 4px)`,
                            width: `calc(${laneWidth}% - 8px)`,
                          }}
                          title={`${block.startTime} - ${block.endTime}`}
                        >
                          <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-[var(--vj-accent)]" aria-hidden />
                          <span className="block pl-2 text-[11px] font-extrabold leading-snug text-slate-900 line-clamp-2">
                            {getTimetableLabel(block)}
                          </span>
                          <span className="mt-0.5 inline-flex items-center gap-1 pl-2 text-[10px] font-medium tabular-nums text-slate-600">
                            <Clock className="h-3 w-3 shrink-0 text-[var(--vj-accent)]" />
                            {block.startTime} - {block.endTime}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <AddToItineraryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tripId={tripId}
        trip={trip}
        location={addLocation}
        users={tripUsers}
        defaultDate={addDefaults?.date || trip.startDate || new Date().toISOString().slice(0, 10)}
        defaultStartTime={addDefaults?.startTime}
        defaultEndTime={addDefaults?.endTime}
        onCreate={async (item, tx) => {
          if (isMockTrip && isAuthenticated) {
            toast.error('Bạn đang xem chuyến đi mẫu. Vui lòng tạo hoặc chọn một chuyến đi thật trong trang "Chuyến đi của tôi" để lưu lại.');
            navigate('/timelines');
            return;
          }

          if (isAuthenticated && addLocation) {
            enqueueRecommendationInteraction({
              ...buildInteractionBase(addLocation),
              eventType: 'ADD_TO_TIMELINE',
            });
            void flushRecommendationInteractionQueue();
          }
          
          setLastTripId(tripId);
          const token = getStoredToken();
          let savedItem = item;

          if (token && !isMockTrip && addLocation) {
            try {
              const dateStr = item.date || new Date().toISOString().slice(0, 10);

              // Normalise category — backend only accepts FOOD / DRINK / ACTIVITY
              const rawCategory = inferCategoryFromLocation(addLocation).toUpperCase();
              const validCategories = ['FOOD', 'DRINK', 'ACTIVITY'];
              const category = validCategories.includes(rawCategory) ? rawCategory : 'ACTIVITY';

              // Strip any category-prefix from the ID (e.g. "food:123" → "123")
              // but avoid extracting lat/lng from compound name-based IDs.
              let cleanExternalId = addLocation.id;
              if (cleanExternalId.includes(':')) {
                const parts = cleanExternalId.split(':');
                const lastPart = parts[parts.length - 1] ?? '';
                // Only strip prefix when the remainder looks like a database ID (numeric or UUID-ish)
                if (/^\d+$/.test(lastPart) || /^[0-9a-f-]{8,}$/i.test(lastPart)) {
                  cleanExternalId = lastPart;
                } else if (parts.length === 2 && parts[1]) {
                  // Simple "category:id" format
                  cleanExternalId = parts[1];
                }
                // Otherwise keep the full compound ID as-is
              }

              if (!cleanExternalId.trim()) {
                throw new Error('ID địa điểm không hợp lệ');
              }

              console.log('[Discovery] Adding event', {
                tripId,
                externalPlaceId: cleanExternalId,
                category,
                startTime: `${dateStr}T${item.startTime}:00`,
                endTime: `${dateStr}T${item.endTime}:00`,
              });

              const created = await addTimelineEvent(tripId, {
                externalPlaceId: cleanExternalId,
                category,
                startTime: `${dateStr}T${item.startTime}:00`,
                endTime: `${dateStr}T${item.endTime}:00`,
                notes: item.notes,
                orderIndex: 0,
                status: 'PLANNED',
              }, token);
              savedItem = { ...item, id: created.id ?? item.id };
              toast.success('Đã lưu vào cơ sở dữ liệu');
            } catch (error: any) {
              console.error('[Discovery] Failed to persist event to backend:', error);
              const detail = error?.message ?? 'Lỗi kết nối máy chủ';
              toast.error(`Không thể lưu hoạt động — ${detail}`);
              return;
            }
          } else if (!isAuthenticated) {
            // Local storage only for guests
            upsertTimelineItem(tripId, trip, item, mockTimeline, mockTransactions);
            if (tx) appendTransaction(tripId, trip, tx, mockTimeline, mockTransactions);
          }

          setTimetableItems((prev) => [...prev.filter((entry) => entry.id !== savedItem.id), savedItem]);
          if (addLocation) {
            setLabelByLocationId((prev) => ({ ...prev, [savedItem.locationId]: addLocation.name }));
          }
          toast.success('Đã thêm vào lịch trình', { description: addLocation?.name });
        }}
      />
    </div>
  );
}

