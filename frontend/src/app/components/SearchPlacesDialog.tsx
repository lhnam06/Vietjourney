import { useState, useMemo } from 'react';
import { Search, MapPin, Star, X, Utensils, GlassWater, Landmark } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { mockLocations, Location } from '../data/mockData';

interface SearchPlacesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (location: Location) => void;
}

type CategoryFilter = 'all' | 'food' | 'drink' | 'activity';

export default function SearchPlacesDialog({ open, onOpenChange, onSelect }: SearchPlacesDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');

  const filteredLocations = useMemo(() => {
    return mockLocations.filter((loc) => {
      const matchesSearch = loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          loc.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = category === 'all' || loc.category.toLowerCase() === category;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, category]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Search className="w-6 h-6 text-[var(--vj-accent)]" />
            Tìm địa điểm mới
          </DialogTitle>
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

          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <Button
              variant={category === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory('all')}
              className={`rounded-full px-4 ${category === 'all' ? 'bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]' : ''}`}
            >
              Tất cả
            </Button>
            <Button
              variant={category === 'food' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory('food')}
              className={`rounded-full px-4 gap-2 ${category === 'food' ? 'bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]' : ''}`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Ẩm thực
            </Button>
            <Button
              variant={category === 'drink' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory('drink')}
              className={`rounded-full px-4 gap-2 ${category === 'drink' ? 'bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]' : ''}`}
            >
              <GlassWater className="w-3.5 h-3.5" />
              Đồ uống
            </Button>
            <Button
              variant={category === 'activity' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategory('activity')}
              className={`rounded-full px-4 gap-2 ${category === 'activity' ? 'bg-[var(--vj-accent)] hover:bg-[var(--vj-accent-2)]' : ''}`}
            >
              <Landmark className="w-3.5 h-3.5" />
              Hoạt động
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="grid grid-cols-1 gap-4">
            {filteredLocations.length > 0 ? (
              filteredLocations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => onSelect(loc)}
                  className="group flex gap-4 p-3 rounded-2xl border border-slate-100 hover:border-[var(--vj-accent)]/50 hover:bg-[var(--vj-accent)]/[0.02] hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                    <img
                      src={loc.image}
                      alt={loc.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
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
                        Quận 1, TP.HCM
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
              <div className="py-20 text-center space-y-3 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 mt-4">
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
