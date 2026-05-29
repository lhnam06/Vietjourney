import { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Star, X, Utensils, GlassWater, Landmark, SlidersHorizontal, ArrowUpDown, Loader2, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import type { Location } from '../types/domain';
import { filterPlaces } from '../lib/placesApi';
import { placeApiRowToLocation } from '../lib/recommendationUtils';

interface SearchPlacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: Location) => void;
}

type CategoryFilter = 'all' | 'food' | 'drink' | 'activity';
type PriceFilter = 'all' | 'free' | 'budget' | 'mid' | 'premium';
type SortFilter = 'relevance' | 'rating' | 'priceAsc' | 'priceDesc';

const minRatingOptions = [
  { value: 0, label: 'Mọi mức điểm' },
  { value: 4, label: 'Từ 4.0 trở lên' },
  { value: 4.5, label: 'Từ 4.5 trở lên' },
];

const priceFilterOptions = [
  { value: 'all', label: 'Mọi mức giá' },
  { value: 'free', label: 'Miễn phí' },
  { value: 'budget', label: 'Dưới 100K' },
  { value: 'mid', label: '100K - 300K' },
  { value: 'premium', label: 'Trên 300K' },
];

export default function SearchPlacesDialog({ open, onOpenChange, onSelect }: SearchPlacesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [minRating, setMinRating] = useState(0);
  const [price, setPrice] = useState<PriceFilter>('all');
  const [sort, setSort] = useState<SortFilter>('relevance');

  // State for backend data
  const [dbLocations, setDbLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const body: any = { page: 0, size: 50 };
        if (category !== 'all') body.category = category;
        if (minRating > 0) body.minRating = minRating;

        if (price === 'budget') {
          body.minPrice = 1;
          body.maxPrice = 100000;
        } else if (price === 'free') {
          body.minPrice = 0;
          body.maxPrice = 0;
        } else if (price === 'mid') {
          body.minPrice = 100000;
          body.maxPrice = 300000;
        } else if (price === 'premium') {
          body.minPrice = 300000;
        }

        const response = await filterPlaces(body);
        if (!cancelled) {
          const mapped = response.data.map(placeApiRowToLocation);
          setDbLocations(mapped);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[SearchDialog] Failed to fetch places:', err);
          setError('Không thể kết nối tới cơ sở dữ liệu địa điểm.');
          setDbLocations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchData, 300); // Debounce
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, category, minRating, price]);

  const filteredLocations = useMemo(() => {
    let results = [...dbLocations];

    // Client-side search filtering (backend /filter doesn't support query param yet)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(loc => 
        (loc.name || '').toLowerCase().includes(q) || 
        (loc.description || '').toLowerCase().includes(q)
      );
    }

    // Client-side sorting
    if (sort === 'rating') {
      results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sort === 'priceAsc') {
      results.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'priceDesc') {
      results.sort((a, b) => (b.price || 0) - (a.price || 0));
    }

    return results;
  }, [searchQuery, dbLocations, sort]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[85vh] max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-[var(--vj-accent)]" />
            Tìm địa điểm mới
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Khám phá các nhà hàng, quán cà phê và điểm tham quan tại TP.HCM.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Tìm kiếm nhà hàng, điểm tham quan, quán cà phê..."
              className="pl-10 h-12 bg-slate-50 border-slate-200 focus:ring-2 focus:ring-[var(--vj-accent)]/20 transition-all rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 rounded-full transition-colors"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <Button
                variant={category === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('all')}
                className={`rounded-full px-4 h-8 text-xs ${category === 'all' ? 'bg-[var(--vj-accent)]' : ''}`}
              >
                Tất cả
              </Button>
              <Button
                variant={category === 'food' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('food')}
                className={`rounded-full px-4 h-8 text-xs gap-2 ${category === 'food' ? 'bg-[var(--vj-accent)]' : ''}`}
              >
                <Utensils className="w-3.5 h-3.5" />
                Ẩm thực
              </Button>
              <Button
                variant={category === 'drink' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('drink')}
                className={`rounded-full px-4 h-8 text-xs gap-2 ${category === 'drink' ? 'bg-[var(--vj-accent)]' : ''}`}
              >
                <GlassWater className="w-3.5 h-3.5" />
                Đồ uống
              </Button>
              <Button
                variant={category === 'activity' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory('activity')}
                className={`rounded-full px-4 h-8 text-xs gap-2 ${category === 'activity' ? 'bg-[var(--vj-accent)]' : ''}`}
              >
                <Landmark className="w-3.5 h-3.5" />
                Hoạt động
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer"
                >
                  {minRatingOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={price}
                  onChange={(e) => setPrice(e.target.value as PriceFilter)}
                  className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer"
                >
                  {priceFilterOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortFilter)}
                  className="bg-transparent text-[11px] font-medium focus:outline-none cursor-pointer"
                >
                  <option value="relevance">Phù hợp</option>
                  <option value="rating">Đánh giá cao</option>
                  <option value="priceAsc">Giá: Thấp → Cao</option>
                  <option value="priceDesc">Giá: Cao → Thấp</option>
                </select>
              </div>

              {(category !== 'all' || minRating > 0 || price !== 'all' || sort !== 'relevance') && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 px-2 text-[10px] text-slate-500 hover:text-slate-900"
                  onClick={() => {
                    setCategory('all');
                    setMinRating(0);
                    setPrice('all');
                    setSort('relevance');
                  }}
                >
                  Xoá bộ lọc
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
            <div className="px-6 mb-4">
              <Alert variant="destructive" className="py-2 border-amber-200 bg-amber-50 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertTitle className="text-xs font-bold">Lưu ý</AlertTitle>
                <AlertDescription className="text-[10px]">{error}</AlertDescription>
              </Alert>
            </div>
          )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0" style={{ height: 'calc(85vh - 250px)' }}>
          <div className="grid grid-cols-1 gap-4">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--vj-accent)]" />
                <p className="text-sm font-medium">Đang tìm kiếm trong kho dữ liệu...</p>
              </div>
            ) : filteredLocations.length > 0 ? (
              filteredLocations.map((loc, idx) => (
                <div
                  key={`${loc.id}-${idx}`}
                  onClick={() => onSelect(loc)}
                  className="group flex gap-4 p-3 rounded-2xl border border-slate-100 hover:border-[var(--vj-accent)]/50 hover:bg-[var(--vj-accent)]/[0.02] hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=400&q=80';
                      }}
                    />
                    <div className="absolute top-1.5 left-1.5">
                      <Badge className="bg-white/90 backdrop-blur-sm text-slate-900 hover:bg-white text-[10px] font-bold px-1.5 h-5 shadow-sm border-none">
                        <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400 text-amber-400" />
                        {loc.rating}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-slate-900 group-hover:text-[var(--vj-accent)] transition-colors truncate">
                        {loc.name}
                      </h4>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[10px] capitalize shrink-0">
                        {loc.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {loc.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[11px] font-medium text-slate-400">
                      <span className="flex items-center gap-1 text-[var(--vj-accent)]">
                        <MapPin className="w-3 h-3" />
                        {loc.recommendation?.district || 'TP.HCM'}
                      </span>
                      <span>•</span>
                      <span className="text-slate-600 font-bold tabular-nums">
                        {loc.price.toLocaleString('vi-VN')} VND
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mt-4 mx-6 mb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold">Không tìm thấy địa điểm nào</p>
                  <p className="text-sm text-slate-500">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
