import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, RefreshCw, Search, MapPin, Sparkles, Star, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, Location, mockTrips, mockUsers, mockTimeline, mockTransactions } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import { toast } from 'sonner';
import AddToItineraryDialog from '../components/AddToItineraryDialog';
import { addTimelineEvent } from '../lib/timelineApi';
import { appendTransaction, getLastTripId, setLastTripId, upsertTimelineItem } from '../lib/tripStorage';
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
  locationSearchText,
  placeApiRowToLocation,
  recommendedPlaceToLocation,
} from '../lib/recommendationUtils';
import { ApiError } from '../lib/api';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { onLocationImageError } from '../lib/imagePlaceholder';

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

export default function Discovery() {
  const [userCenter, setUserCenter] = useState<[number, number] | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [selectedTagGroup, setSelectedTagGroup] = useState<string>('all');
  const [selectedTagValues, setSelectedTagValues] = useState<string[]>([]);
  const [sortFilter, setSortFilter] = useState<SortFilter>('relevance');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLocation, setAddLocation] = useState<Location | null>(null);
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
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const listCardsRef = useRef<HTMLDivElement>(null);
  
  const [currentTripId, setCurrentTripId] = useState(getLastTripId('trip-1'));

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
      if (!user?.token || !tripId) {
        setIsLoading(false);
        return;
      }
      setSelectedTagGroup('all');
      setSelectedTagValues([]);
      return;
    }
    const allow = new Set(availableTagValues.map((x) => x.label.toLowerCase()));
    setSelectedTagValues((prev) => prev.filter((x) => allow.has(x.toLowerCase())));
  }, [selectedTagGroup, selectedTagValues.length, availableTagValues, tagGroupOptions]);

  const center: [number, number] = effectiveCenter;
  const selectedLocation = selectedLocationId
    ? baseLocations.find((l) => l.id === selectedLocationId) ?? null
    : null;

  const openAdd = (location: Location) => {
    setAddLocation(location);
    setAddOpen(true);
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
    <div className="h-full flex bg-[var(--vj-bg)]">
      {/* Left Panel - Search & Filters & List */}
      <div className="w-[500px] flex flex-col bg-[var(--vj-surface)] border-r border-[var(--vj-border)] m-4 rounded-2xl overflow-hidden shadow-2xl relative z-[1050]">
        {/* Header */}
        <div className="p-6 border-b border-[var(--vj-border)] bg-gradient-to-br from-[var(--vj-primary)] via-[var(--vj-primary-2)] to-[#0f4b68]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🇻🇳</span>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Khám Phá Việt Nam</h1>
              <p className="text-white/85 text-sm">Chạm để tìm quán ăn, trải nghiệm và điểm check-in phù hợp gu của bạn</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-white/90">
                <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">
                  {trip.destination}
                </span>
                <span className="rounded-full border border-white/30 bg-white/10 px-2.5 py-1">
                  {baseLocations.length} địa điểm nguồn
                </span>
              </div>
              {catalogLoading && (
                <p className="mt-1.5 text-xs font-medium text-white/80">Đang tải danh sách địa điểm từ máy chủ…</p>
              )}
              {!catalogLoading && catalogLocations.length > 0 && !recommendedLocations && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <MapPin className="size-3.5" />
                  Đang xem dữ liệu thật từ API (ưu tiên khu TP.HCM)
                </p>
              )}
              {isAuthenticated && recoLoading && (
                <p className="mt-2 text-xs font-medium text-white/85">Đang tải gợi ý cá nhân…</p>
              )}
              {isAuthenticated && !recoLoading && recommendedLocations && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                  <Sparkles className="size-3.5" />
                  Gợi ý cá nhân từ tài khoản của bạn
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
            <div className="p-4 pb-0">
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
            <div className="p-4 pb-0">
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
            <div className="p-4 pb-0">
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
          <div className="p-6 border-b border-slate-200 space-y-4 bg-white/70">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                <SlidersHorizontal className="size-3.5" />
                Bộ lọc theo dữ liệu
              </div>
              {activeFilterCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs text-slate-600 hover:text-slate-900"
                  onClick={clearAllFilters}
                >
                  Xóa bộ lọc ({activeFilterCount})
                </Button>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Loại địa điểm</p>
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

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Quận / khu vực</p>
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={districtFilter}
                  onChange={(e) => setDistrictFilter(e.target.value)}
                  className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Đánh giá</p>
                <select
                  value={String(minRatingFilter)}
                  onChange={(e) => setMinRatingFilter(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                >
                  {minRatingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Mức giá</p>
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value as PriceFilter)}
                  className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                >
                  {priceFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Bộ tag theo nhóm (backend)</p>
              <select
                value={selectedTagGroup}
                onChange={(e) => {
                  setSelectedTagGroup(e.target.value);
                  setSelectedTagValues([]);
                }}
                className="mb-2 h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
              >
                <option value="all">Không lọc theo tag</option>
                {tagGroupOptions.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-2">
                {selectedTagGroup !== 'all' && availableTagValues.length === 0 ? (
                  <span className="text-xs text-slate-500">Nhóm tag này chưa có dữ liệu khả dụng.</span>
                ) : null}
                {availableTagValues.map((item) => (
                  <Button
                    key={item.label}
                    variant={selectedTagValues.some((t) => t.toLowerCase() === item.label.toLowerCase()) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleTag(item.label)}
                    className={`rounded-full ${
                      selectedTagValues.some((t) => t.toLowerCase() === item.label.toLowerCase())
                        ? 'bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]'
                        : 'border-slate-300'
                    }`}
                  >
                    {item.label}
                    <span className="ml-1 text-[10px] opacity-80">{item.count}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Sắp xếp</p>
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

          {/* Results Count */}
          <div className="px-6 py-3 bg-slate-100 border-b border-slate-200">
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
          <div ref={listCardsRef} className="p-4 space-y-4">
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
                className={`p-4 hover:shadow-xl transition-all cursor-pointer border ${
                  selectedLocationId === location.id
                    ? 'border-[var(--vj-accent)] shadow-lg ring-2 ring-[var(--vj-accent)]/20'
                    : 'border-slate-200 hover:border-[var(--vj-accent)]/50'
                }`}
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
                <div className="flex gap-4">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-28 h-28 rounded-xl object-cover flex-shrink-0 shadow-sm"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="strict-origin-when-cross-origin"
                    onError={onLocationImageError}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-[var(--vj-primary)] text-lg leading-tight">
                        {location.name}
                      </h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-slate-700">{location.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-2 line-clamp-2">
                      {location.description}
                    </p>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {nearbyRecommendationIds.has(location.id) && (
                        <Badge className="text-[11px] bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200">
                          Gợi ý gần bạn
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-[11px] border-slate-300 text-slate-600">
                        {location.weather === 'indoor' ? 'Trong nhà' : location.weather === 'outdoor' ? 'Ngoài trời' : 'Linh hoạt'}
                      </Badge>
                      <Badge variant="outline" className="text-[11px] border-slate-300 text-slate-600">
                        {location.vibe === 'quiet' ? 'Yên tĩnh' : location.vibe === 'vibrant' ? 'Sôi động' : 'Cân bằng'}
                      </Badge>
                      {location.recommendation?.district && (
                        <Badge variant="outline" className="text-[11px] border-slate-300 text-slate-600">
                          {location.recommendation.district}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1.5">
                        {location.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-[color-mix(in_oklab,var(--vj-primary)_10%,white)] text-[var(--vj-primary)] hover:bg-[color-mix(in_oklab,var(--vj-primary)_16%,white)]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="flex items-center gap-1 text-[var(--vj-accent)] font-bold text-sm">
                          {formatVND(location.price)}
                        </div>
                        <Button
                          size="sm"
                          className="h-8 rounded-full bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white px-4"
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
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right Panel - Map */}
      <div className="flex-1 relative m-4 rounded-2xl overflow-hidden shadow-2xl border border-[var(--vj-border)] bg-white min-h-0">
        <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-slate-200 min-w-64">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-[#FF6B35]" />
            <h3 className="font-bold text-[var(--vj-primary)]">
              {gpsStatus === 'granted' ? 'Bản đồ gần bạn' : 'Bản đồ TP. HCM'}
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Hiển thị {filteredLocations.length} địa điểm
          </p>
          {selectedLocation && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <p className="text-xs font-semibold text-slate-900 line-clamp-1">{selectedLocation.name}</p>
              <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">{selectedLocation.description}</p>
            </div>
          )}
        </div>

        <SimpleMap
          locations={filteredLocations}
          center={center}
          userLocation={userCenter ?? undefined}
          showRoute={false}
        />
      </div>

      <AddToItineraryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        tripId={tripId}
        trip={trip}
        location={addLocation}
        users={tripUsers}
        defaultDate={trip.startDate || new Date().toISOString().slice(0, 10)}
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

          if (token && !isMockTrip && addLocation) {
            try {
              console.log(`[Discovery] Persisting to real timeline: ${tripId}`);
              const dateStr = item.date || new Date().toISOString().slice(0, 10);
              const category = inferCategoryFromLocation(addLocation).toUpperCase();
              
              // De-prefix ID to prevent double-prefixing in database
              const cleanExternalId = item.locationId.includes(':') 
                ? item.locationId.split(':').pop()! 
                : item.locationId;

              await addTimelineEvent(tripId, {
                externalPlaceId: cleanExternalId,
                category: category, // Backend expects uppercase enum
                startTime: `${dateStr}T${item.startTime}:00`,
                endTime: `${dateStr}T${item.endTime}:00`,
                notes: item.notes,
                orderIndex: 0,
                status: 'PLANNED'
              }, token);
              toast.success('Đã lưu vào cơ sở dữ liệu');
            } catch (error: any) {
              console.error('[Discovery] Failed to persist event to backend:', error);
              toast.error(error.message || 'Lỗi kết nối máy chủ - không thể lưu dữ liệu');
              return; // Don't proceed if backend save failed
            }
          } else if (!isAuthenticated) {
            // Local storage only for guests
            upsertTimelineItem(tripId, trip, item, mockTimeline, mockTransactions);
            if (tx) appendTransaction(tripId, trip, tx, mockTimeline, mockTransactions);
          }

          toast.success('Đã thêm vào lịch trình', { description: addLocation?.name });
          navigate(`/workspace/${tripId}`);
        }}
      />
    </div>
  );
}

