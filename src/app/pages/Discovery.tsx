import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Search, MapPin, Star } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockLocations, Location } from '../data/mockData';
import SimpleMap from '../components/SimpleMap';
import { toast } from 'sonner';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<WeatherFilter>('all');
  const [vibeFilter, setVibeFilter] = useState<VibeFilter>('all');
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilter>('all');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredLocations = useMemo(() => {
    return mockLocations.filter((location) => {
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
  }, [searchQuery, weatherFilter, vibeFilter, budgetFilter]);

  const center: [number, number] = [21.0285, 105.8542]; // Hanoi coordinates
  const selectedLocation = selectedLocationId
    ? mockLocations.find((l) => l.id === selectedLocationId) ?? null
    : null;

  const handleAddToTimeline = (location: Location) => {
    localStorage.setItem('vj:pendingAdd', JSON.stringify({ locationId: location.id, date: new Date().toISOString().slice(0, 10) }));
    toast.success('Đã gửi sang lịch trình', { description: location.name });
    navigate('/workspace/trip-1');
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
              <p className="text-white/80 text-sm">Tìm kiếm địa điểm ở Hà Nội</p>
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
          </p>
        </div>

        {/* Location Cards List */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {filteredLocations.map((location) => (
              <Card
                key={location.id}
                className={`p-4 hover:shadow-lg transition-all cursor-pointer border-2 ${
                  selectedLocationId === location.id
                    ? 'border-[var(--vj-accent)] shadow-lg'
                    : 'border-transparent hover:border-[var(--vj-accent)]'
                }`}
                onClick={() => setSelectedLocationId(location.id)}
              >
                <div className="flex gap-4">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-24 h-24 rounded-lg object-cover flex-shrink-0"
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
                            handleAddToTimeline(location);
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
            <h3 className="font-bold text-[var(--vj-primary)]">Bản Đồ Hà Nội</h3>
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
    </div>
  );
}
