import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { AlertCircle, RefreshCw, Search, MapPin, Sparkles, Star } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, Location, mockTrips, mockUsers, mockTimeline, mockTransactions } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import { toast } from 'sonner';
import AddToItineraryDialog from '../components/AddToItineraryDialog';
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
  placeApiRowToLocation,
  preferHoChiMinhCatalog,
  recommendedPlaceToLocation,
} from '../lib/recommendationUtils';
import { ApiError } from '../lib/api';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

type WeatherFilter = 'all' | 'indoor' | 'outdoor';
type VibeFilter = 'all' | 'quiet' | 'vibrant';
type BudgetFilter = 'all' | '$' | '$$' | '$$$';

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

export default function Discovery() {
  const { isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<WeatherFilter>('all');
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>('all');
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLocation, setAddLocation] = useState<Location | null>(null);
  const [recommendedLocations, setRecommendedLocations] = useState<Location[] | null>(null);
  const [recoLoading, setRecoLoading] = useState(false);
  /** When personalized fetch fails or returns no rows, we fall back to mock data. */
  const [recoFallback, setRecoFallback] = useState<'none' | 'error' | 'empty'>('none');
  const [recoErrorMessage, setRecoErrorMessage] = useState<string | null>(null);
  const [recoRetryKey, setRecoRetryKey] = useState(0);
  /** Public places catalog from `POST /api/v1/places/filter` (HCMC-prioritised when coords allow). */
  const [catalogLocations, setCatalogLocations] = useState<Location[] | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogRetryKey, setCatalogRetryKey] = useState(0);
  const navigate = useNavigate();
  const listCardsRef = useRef<HTMLDivElement>(null);
  const tripId = getLastTripId('trip-1');
  const trip = mockTrips.find((t) => t.id === tripId) ?? mockTrips[0];
  const tripUsers = mockUsers.filter((u) => trip.participants.includes(u.id));

  const baseLocations =
    recommendedLocations ?? catalogLocations ?? mockLocations;

  const filteredLocations = useMemo(() => {
    return baseLocations.filter((location) => {
      const matchesSearch =
        searchQuery === '' ||
        location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        location.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesWeather =
        weatherFilter === 'all' ||
        location.weather === weatherFilter ||
        location.weather === 'both';

      const matchesVibe = vibeFilter === 'all' || location.vibe === vibeFilter;

      const matchesBudget = budgetFilter === 'all' || location.budget === budgetFilter;

      return matchesSearch && matchesWeather && matchesVibe && matchesBudget;
    });
  }, [baseLocations, searchQuery, weatherFilter, vibeFilter, budgetFilter]);

  useEffect(() => {
    let cancelled = false;
    setCatalogLoading(true);
    setCatalogError(null);
    void (async () => {
      try {
        const res = await filterPlaces({ page: 0, size: 80 });
        if (cancelled) return;
        const rows = res.data ?? [];
        if (!rows.length) {
          setCatalogLocations(null);
          return;
        }
        const mapped = preferHoChiMinhCatalog(rows.map(placeApiRowToLocation));
        setCatalogLocations(mapped);
      } catch (e) {
        if (!cancelled) {
          setCatalogLocations(null);
          setCatalogError(
            e instanceof ApiError ? e.message : 'Không tải được danh sách địa điểm từ máy chủ.'
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [catalogRetryKey]);

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

  const center: [number, number] = HCMC_CENTER;
  const selectedLocation = selectedLocationId
    ? baseLocations.find((l) => l.id === selectedLocationId) ?? null
    : null;

  const openAdd = (location: Location) => {
    setAddLocation(location);
    setAddOpen(true);
  };

  return (
    <div className="h-full flex bg-[var(--vj-bg)]">
      {/* Left Panel - Search & Filters & List */}
      <div className="w-[480px] flex flex-col bg-[var(--vj-surface)] border-r border-[var(--vj-border)] m-4 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[var(--vj-border)] bg-gradient-to-r from-[var(--vj-primary)] to-[var(--vj-primary-2)]">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">🇻🇳</span>
            <div>
              <h1 className="text-3xl font-bold text-white">KHÁM PHÁ</h1>
              <p className="text-white/80 text-sm">Tìm kiếm địa điểm ở TP. Hồ Chí Minh và lân cận</p>
              {catalogLoading && (
                <p className="mt-1.5 text-xs font-medium text-white/80">Đang tải danh sách địa điểm từ máy chủ…</p>
              )}
              {!catalogLoading && catalogLocations && !recommendedLocations && (
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
              placeholder="Tìm kiếm địa điểm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-full border-slate-300 bg-white"
            />
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
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Thời Tiết</p>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Tất Cả' },
                  { value: 'indoor', label: 'Trong Nhà' },
                  { value: 'outdoor', label: 'Ngoài Trời' },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={weatherFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setWeatherFilter(filter.value as WeatherFilter)}
                    className={`rounded-full ${
                      weatherFilter === filter.value
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
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Không Khí</p>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Tất Cả' },
                  { value: 'quiet', label: 'Yên Tĩnh' },
                  { value: 'vibrant', label: 'Sôi Động' },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={vibeFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setVibeFilter(filter.value as VibeFilter)}
                    className={`rounded-full ${
                      vibeFilter === filter.value
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
              <p className="text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Ngân Sách</p>
              <div className="flex gap-2">
                {[
                  { value: 'all', label: 'Tất Cả' },
                  { value: '$', label: 'Rẻ' },
                  { value: '$$', label: 'Trung Bình' },
                  { value: '$$$', label: 'Cao' },
                ].map((filter) => (
                  <Button
                    key={filter.value}
                    variant={budgetFilter === filter.value ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setBudgetFilter(filter.value as BudgetFilter)}
                    className={`rounded-full ${
                      budgetFilter === filter.value
                        ? 'bg-[var(--vj-primary)] hover:bg-[var(--vj-primary-2)]'
                        : 'border-slate-300'
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="px-6 py-3 bg-slate-100 border-b border-slate-200">
            <p className="text-sm text-slate-600">
              <span className="font-bold text-[var(--vj-primary)]">{filteredLocations.length}</span> địa điểm được tìm thấy
              {(recoLoading && isAuthenticated) || catalogLoading ? (
                <span className="ml-2 text-xs font-medium text-slate-500">Đồng bộ dữ liệu…</span>
              ) : null}
            </p>
          </div>

          {/* Location Cards List */}
          <div ref={listCardsRef} className="p-4 space-y-3">
            {filteredLocations.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-800">Không có địa điểm khớp bộ lọc</p>
                <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
                  Thử đặt lại thời tiết, không khí, ngân sách hoặc xóa từ khóa tìm kiếm.
                </p>
              </div>
            ) : null}
            {filteredLocations.map((location) => (
              <Card
                key={location.id}
                data-place-id={location.id}
                className={`p-4 hover:shadow-lg transition-all cursor-pointer border-2 ${
                  selectedLocationId === location.id
                    ? 'border-[var(--vj-accent)] shadow-lg'
                    : 'border-transparent hover:border-[var(--vj-accent)]'
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
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
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
                    <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                      {location.description}
                    </p>
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
                          className="h-8 bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)] text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAdd(location);
                          }}
                        >
                          Thêm
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
        <div className="absolute top-4 left-4 z-[1000] bg-white/95 backdrop-blur-md rounded-xl p-4 shadow-lg border border-slate-200">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-5 h-5 text-[#FF6B35]" />
            <h3 className="font-bold text-[var(--vj-primary)]">Bản đồ TP. HCM</h3>
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
        defaultDate={new Date().toISOString().slice(0, 10)}
        onCreate={(item, tx) => {
          if (isAuthenticated && addLocation) {
            enqueueRecommendationInteraction({
              ...buildInteractionBase(addLocation),
              eventType: 'ADD_TO_TIMELINE',
            });
            void flushRecommendationInteractionQueue();
          }
          setLastTripId(tripId);
          upsertTimelineItem(tripId, trip, item, mockTimeline, mockTransactions);
          if (tx) appendTransaction(tripId, trip, tx, mockTimeline, mockTransactions);
          toast.success('Đã thêm vào lịch trình', { description: addLocation?.name });
          navigate(`/workspace/${tripId}`);
        }}
      />
    </div>
  );
}

