import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Camera, MapPin, Calendar, Settings, Heart, Zap, DollarSign, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { ScrollArea } from '../components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { mockUsers } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../lib/authApi';
import { ApiError } from '../lib/api';
import { getMyRecommendationProfile, type UserRecommendationProfile } from '../lib/recommendationApi';
import { getMyTimelines, type ApiTimelineDetail } from '../lib/timelineApi';
import { useLocalStorageState } from '../hooks/useLocalStorageState';
import { cacheGet, cacheSet, cacheIsStale } from '../lib/apiCache';

function sortByScore<T extends { score: number }>(rows: T[]) {
  return [...rows].sort((a, b) => b.score - a.score);
}

/** Friendly Vietnamese labels for the raw backend tag-group keys. */
const TAG_GROUP_LABELS: Record<string, string> = {
  purpose: 'Mục đích',
  amenity: 'Tiện ích',
  service_style: 'Phong cách phục vụ',
  sub_category: 'Phân loại',
  vibe: 'Không khí',
  cuisine: 'Ẩm thực',
  price_level: 'Mức giá',
};

/** Convert a snake_case / variable-style token into human-readable words. */
function humanizeToken(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}

function tagGroupLabel(group: string): string {
  const key = (group || '').trim().toLowerCase();
  return TAG_GROUP_LABELS[key] ?? humanizeToken(group);
}

export default function Profile() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUser = mockUsers[0];

  const TIMELINES_CACHE = 'profile:my-timelines';
  const [timelines, setTimelines] = useState<ApiTimelineDetail[]>(() => cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE) ?? []);
  const [timelinesLoading, setTimelinesLoading] = useState(() => !cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE)?.length);
  const [timelinesError, setTimelinesError] = useState<string | null>(null);

  const [pace, setPace] = useLocalStorageState<number>('vj:profile:pace', currentUser.preferences.pace);
  const [budgetLevel, setBudgetLevel] = useLocalStorageState<number>('vj:profile:budget-level', currentUser.preferences.budgetLevel);
  const [favoriteCategories, setFavoriteCategories] = useLocalStorageState<string[]>(
    'vj:profile:favorite-categories',
    currentUser.preferences.favoriteCategories
  );

  const [recoProfile, setRecoProfile] = useState<UserRecommendationProfile | null>(null);
  const [recoProfileLoading, setRecoProfileLoading] = useState(false);
  const [recoProfileError, setRecoProfileError] = useState<string | null>(null);
  const [recoProfileRetry, setRecoProfileRetry] = useState(0);

  const displayName =
    isAuthenticated && user?.displayName?.trim()
      ? user.displayName
      : isAuthenticated && user?.username
        ? user.username
        : currentUser.name;

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setRecoProfile(null);
      setRecoProfileLoading(false);
      setRecoProfileError(null);
      return;
    }
    const token = getStoredToken();
    if (!token) {
      setRecoProfile(null);
      return;
    }

    let cancelled = false;
    setRecoProfileError(null);
    setRecoProfileLoading(true);

    void (async () => {
      try {
        const data = await getMyRecommendationProfile(token);
        if (!cancelled) setRecoProfile(data);
      } catch (e) {
        if (!cancelled) {
          setRecoProfile(null);
          setRecoProfileError(
            e instanceof ApiError ? e.message : 'Không tải được hồ sơ gợi ý.'
          );
        }
      } finally {
        if (!cancelled) setRecoProfileLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading, recoProfileRetry]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setTimelines([]);
      return;
    }
    const token = getStoredToken();
    if (!token) return;

    // Skip fetch if cache is fresh
    if (!cacheIsStale(TIMELINES_CACHE) && cacheGet(TIMELINES_CACHE)) return;

    const hasCachedData = (cacheGet<ApiTimelineDetail[]>(TIMELINES_CACHE) ?? []).length > 0;
    let cancelled = false;
    if (!hasCachedData) setTimelinesLoading(true);
    setTimelinesError(null);

    void (async () => {
      try {
        const data = await getMyTimelines(token);
        if (!cancelled) {
          const rows = data ?? [];
          cacheSet(TIMELINES_CACHE, rows, { persistent: true });
          setTimelines(rows);
        }
      } catch (e) {
        if (!cancelled && !hasCachedData) {
          setTimelinesError(e instanceof ApiError ? e.message : 'Không tải được danh sách chuyến đi.');
        }
      } finally {
        if (!cancelled) setTimelinesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, authLoading]);

  const sortedReco = useMemo(() => {
    if (!recoProfile) return null;
    return {
      tags: sortByScore(recoProfile.tags ?? []).slice(0, 24),
      districts: sortByScore(recoProfile.districts ?? []).slice(0, 16),
      categories: sortByScore(recoProfile.categories ?? []).slice(0, 8),
    };
  }, [recoProfile]);

  const recoIsEmpty =
    !!recoProfile &&
    !(recoProfile.tags?.length || recoProfile.districts?.length || recoProfile.categories?.length);

  const allCategories = ['Ẩm Thực', 'Văn Hóa', 'Lịch Sử', 'Phiêu Lưu', 'Thiên Nhiên', 'Nhiếp Ảnh', 'Mua Sắm', 'Nghỉ Dưỡng', 'Giải Trí', 'Địa Phương'];

  const toggleCategory = (category: string) => {
    if (favoriteCategories.includes(category)) {
      setFavoriteCategories(favoriteCategories.filter((c) => c !== category));
    } else {
      setFavoriteCategories([...favoriteCategories, category]);
    }
  };

  const paceLabels = ['Thư Giãn', 'Thoải Mái', 'Trung Bình', 'Năng Động', 'Mạnh Mẽ'];
  const budgetLabels = ['Tiết Kiệm', 'Trung Bình', 'Cao Cấp'];

  return (
    <div className="h-full bg-slate-50">
      <ScrollArea className="h-full">
        <div className="max-w-[var(--vj-content-max)] mx-auto px-[var(--vj-page-pad-x)] py-[var(--vj-page-pad-y)] space-y-[var(--vj-stack-gap)]">
          {/* Profile Header */}
          <Card className="overflow-hidden shadow-lg">
            <div className="h-32 bg-gradient-to-r from-[#0A4A6E] via-[#0d5d8a] to-[#0A4A6E]" />
            <div className="px-[var(--vj-inset)] pb-[var(--vj-inset)]">
              <div className="flex items-end justify-between -mt-16 mb-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl ring-4 ring-[#FF6B35]/20">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{displayName.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full bg-[#FF6B35] hover:bg-[#ff7d4d] shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" className="mb-4 border-[#0A4A6E] text-[#0A4A6E] hover:bg-[#0A4A6E] hover:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Chỉnh Sửa Hồ Sơ
                </Button>
              </div>

              <div className="mb-4">
                <h1 className="text-3xl font-bold text-[#0A4A6E] mb-1">{displayName}</h1>
                <p className="text-slate-600">
                  {isAuthenticated && user
                    ? `@${user.username}`
                    : currentUser.email}
                </p>
              </div>

              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{timelines.length}</p>
                  <p className="text-sm text-slate-600">Chuyến Đi</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">15</p>
                  <p className="text-sm text-slate-600">Tỉnh Thành</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">87</p>
                  <p className="text-sm text-slate-600">Địa Điểm</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Backend recommendation profile (GET /api/v1/recommendations/profile/me) */}
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-[#FF6B35]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">HỒ SƠ GỢI Ý (TỪ HÀNH VI)</h2>
            </div>

            {!authLoading && !isAuthenticated && (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center">
                <p className="text-sm text-slate-700">
                  Đăng nhập để xem trọng số thẻ tag, quận và loại địa điểm mà hệ thống học được từ bạn trên Khám phá.
                </p>
                <Button asChild className="mt-3 bg-[#0A4A6E] hover:bg-[#0d5d8a]">
                  <Link to={`/auth?next=${encodeURIComponent('/profile')}`}>Đến đăng nhập</Link>
                </Button>
              </div>
            )}

            {isAuthenticated && recoProfileLoading && (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full max-w-md" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-24 rounded-full" />
                  <Skeleton className="h-7 w-32 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
                <Skeleton className="h-4 w-full max-w-lg" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-7 w-36 rounded-full" />
                  <Skeleton className="h-7 w-28 rounded-full" />
                </div>
              </div>
            )}

            {isAuthenticated && !recoProfileLoading && recoProfileError && (
              <Alert variant="destructive" className="border-red-200 bg-red-50/90">
                <AlertCircle />
                <AlertTitle>Không tải được hồ sơ gợi ý</AlertTitle>
                <AlertDescription className="text-red-900/85">
                  <p>{recoProfileError}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 border-red-300 bg-white text-red-900 hover:bg-red-50"
                    onClick={() => setRecoProfileRetry((n) => n + 1)}
                  >
                    <RefreshCw className="size-3.5 mr-1.5" />
                    Thử lại
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {isAuthenticated && !recoProfileLoading && !recoProfileError && recoProfile && recoIsEmpty && (
              <p className="text-sm text-slate-600">
                Chưa có tín hiệu trong hồ sơ (đã suy giảm theo thời gian hoặc chưa có tương tác). Ghé{' '}
                <Link to="/" className="font-semibold text-[#0A4A6E] underline underline-offset-2">
                  Khám phá
                </Link>{' '}
                và mở vài địa điểm để làm đầy dần profile.
              </p>
            )}

            {isAuthenticated && !recoProfileLoading && !recoProfileError && sortedReco && !recoIsEmpty && (
              <div className="space-y-8">
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Sở thích nổi bật</h3>
                  <div className="flex flex-wrap gap-2">
                    {sortedReco.tags.map((t) => (
                      <Badge
                        key={`${t.tagGroup}:${t.tagValue}`}
                        variant="secondary"
                        className="rounded-full bg-[#0A4A6E]/10 px-3 py-1.5 text-[#0A4A6E] hover:bg-[#0A4A6E]/15"
                      >
                        <span className="text-xs font-medium text-[#0A4A6E]/60">{tagGroupLabel(t.tagGroup)}</span>
                        <span className="mx-1.5 text-[#0A4A6E]/30">·</span>
                        <span className="font-semibold">{humanizeToken(t.tagValue)}</span>
                      </Badge>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Quận / Khu</h3>
                  <div className="flex flex-wrap gap-2">
                    {sortedReco.districts.map((d) => (
                      <Badge
                        key={d.value}
                        variant="outline"
                        className="rounded-full border-[#FF6B35]/40 px-3 py-1.5 font-medium text-slate-800"
                      >
                        {humanizeToken(d.value)}
                      </Badge>
                    ))}
                  </div>
                </section>
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">Loại địa điểm</h3>
                  <div className="flex flex-wrap gap-2">
                    {sortedReco.categories.map((c) => (
                      <Badge key={c.value} className="rounded-full bg-[#FF6B35] px-3 py-1.5 font-semibold text-white hover:bg-[#ff7d4d]">
                        {humanizeToken(c.value)}
                      </Badge>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </Card>

          {/* Travel Preferences */}
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-[#FF6B35]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">SỞ THÍCH DU LỊCH</h2>
            </div>

            <div className="space-y-8">
              {/* Travel Pace */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#0A4A6E]" />
                  <p className="font-semibold text-slate-700">Nhịp Độ Du Lịch</p>
                </div>
                <div className="mb-2">
                  <Slider
                    value={[pace]}
                    onValueChange={(value) => setPace(value[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  {paceLabels.map((label, i) => (
                    <span
                      key={label}
                      className={`${pace === i + 1 ? 'text-[#0A4A6E] font-bold' : ''}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget Level */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-[#0A4A6E]" />
                  <p className="font-semibold text-slate-700">Mức Ngân Sách</p>
                </div>
                <div className="mb-2">
                  <Slider
                    value={[budgetLevel]}
                    onValueChange={(value) => setBudgetLevel(value[0])}
                    min={1}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  {budgetLabels.map((label, i) => (
                    <span
                      key={label}
                      className={`${budgetLevel === i + 1 ? 'text-[#0A4A6E] font-bold' : ''}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Favorite Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-[#FF6B35]" />
                  <p className="font-semibold text-slate-700">Danh Mục Yêu Thích</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => {
                    const isSelected = favoriteCategories.includes(category);
                    return (
                      <Badge
                        key={category}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FF6B35] hover:bg-[#ff7d4d] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        onClick={() => toggleCategory(category)}
                      >
                        {isSelected && '✓ '}
                        {category}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <Button className="w-full bg-[#0A4A6E] hover:bg-[#0d5d8a]">
                Lưu Sở Thích
              </Button>
            </div>
          </Card>

          {/* Past Trips */}
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-[#0A4A6E]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">CHUYẾN ĐI CỦA TÔI</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timelinesLoading && (
                <>
                  <Skeleton className="h-56 w-full rounded-xl" />
                  <Skeleton className="h-56 w-full rounded-xl" />
                </>
              )}
              
              {!timelinesLoading && timelinesError && (
                <div className="col-span-full">
                   <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Lỗi</AlertTitle>
                    <AlertDescription>{timelinesError}</AlertDescription>
                  </Alert>
                </div>
              )}

              {!timelinesLoading && !timelinesError && timelines.length === 0 && (
                <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl">
                  <p className="text-slate-500">Bạn chưa có chuyến đi nào.</p>
                  <Button asChild variant="link" className="text-[#0A4A6E]">
                    <Link to="/timelines">Tạo timeline ngay</Link>
                  </Button>
                </div>
              )}

              {!timelinesLoading && timelines.map((trip) => (
                <Link key={trip.id} to={`/workspace/${trip.id}`}>
                  <Card
                    className="overflow-hidden h-full hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#FF6B35]"
                  >
                    <div className="relative h-40">
                      <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                        <MapPin className="w-12 h-12 text-slate-400 opacity-20" />
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-white text-lg mb-1">{trip.title}</h3>
                        <div className="flex items-center gap-2 text-white/90 text-sm">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{trip.description || 'Chưa có mô tả'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(trip.startDate).toLocaleDateString('vi-VN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <Badge className="bg-[#0A4A6E]/10 text-[#0A4A6E] hover:bg-[#0A4A6E]/20">
                          {trip.members?.length || 1} người
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
