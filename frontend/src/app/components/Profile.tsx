import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bell,
  Bookmark,
  CalendarDays,
  Camera,
  Compass,
  Flame,
  Globe2,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Route,
  Star,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import {
  fetchCurrentUser,
  fetchMyTimelines,
  fetchRecentNotifications,
  tripCoverImage,
  type CurrentUser,
  type NotificationItem,
  type Timeline,
} from "../lib/timelineApi";
import { categoryLabel, placeImage, type Place } from "../lib/placesApi";
import { cn } from "../lib/utils";

interface ProfileProps {
  savedPlaces: Place[];
  onExplore: () => void;
  onEditTimeline: (timeline: Timeline) => void;
}

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1800&q=80";

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateOnly(value));
}

function formatTripRange(timeline: Timeline) {
  return `${formatDate(timeline.startDate)} - ${formatDate(timeline.endDate)}`;
}

function dayCount(timeline: Timeline) {
  const start = dateOnly(timeline.startDate).getTime();
  const end = dateOnly(timeline.endDate).getTime();
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function relativeTime(value: string) {
  const date = new Date(value);
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} ngày trước`;
}

function displayPlaceArea(place: Place) {
  return place.district || place.address || "Việt Nam";
}

function memberCount(timeline: Timeline) {
  return Math.max(1, timeline.members.length || 1);
}

function uniqueDistricts(timelines: Timeline[], savedPlaces: Place[]) {
  const districts = new Set<string>();

  for (const timeline of timelines) {
    for (const event of timeline.events) {
      if (event.place?.district) districts.add(event.place.district);
    }
  }

  for (const place of savedPlaces) {
    if (place.district) districts.add(place.district);
  }

  return districts.size;
}

export function Profile({ savedPlaces, onExplore, onEditTimeline }: ProfileProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const [nextUser, nextTimelines, nextNotifications] = await Promise.all([
          fetchCurrentUser(controller.signal).catch(() => null),
          fetchMyTimelines(controller.signal).catch(() => []),
          fetchRecentNotifications(controller.signal).catch(() => []),
        ]);

        setUser(nextUser);
        setTimelines(nextTimelines);
        setNotifications(nextNotifications);
      } catch (profileError) {
        setError("Không tải được hồ sơ của bạn. Vui lòng thử lại sau.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => controller.abort();
  }, []);

  const sortedTimelines = useMemo(
    () =>
      [...timelines].sort(
        (first, second) =>
          dateOnly(second.startDate).getTime() - dateOnly(first.startDate).getTime(),
      ),
    [timelines],
  );

  const recentTrips = sortedTimelines.slice(0, 4);
  const heroImage = recentTrips[0] ? tripCoverImage(recentTrips[0]) : fallbackHeroImage;
  const displayName = user?.displayName || user?.username || "Nhà du hành";
  const username = user?.username ? `@${user.username}` : "@vietjourney";
  const totalDays = timelines.reduce((sum, timeline) => sum + dayCount(timeline), 0);
  const totalMembers = timelines.reduce((sum, timeline) => sum + memberCount(timeline), 0);
  const plannedPlaces = timelines.reduce((sum, timeline) => sum + timeline.events.length, 0);
  const savedDistrictCount = uniqueDistricts(timelines, savedPlaces);
  const savedByCategory = useMemo(
    () =>
      savedPlaces.reduce<Record<string, Place[]>>((groups, place) => {
        const category = place.category || "OTHER";
        groups[category] = [...(groups[category] || []), place];
        return groups;
      }, {}),
    [savedPlaces],
  );
  const topSavedGroups = Object.entries(savedByCategory).slice(0, 4);

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[linear-gradient(135deg,oklch(0.99_0.004_255),oklch(0.965_0.018_260))]">
      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            aria-label="Thông báo"
            className="relative flex size-11 items-center justify-center rounded-full border border-border bg-card/90 text-muted-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:text-primary"
          >
            <Bell className="size-5" />
            {notifications.length ? (
              <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {Math.min(notifications.length, 9)}
              </span>
            ) : null}
          </button>
        </div>

        <section className="relative mt-4 overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_90px_oklch(0.34_0.04_255_/_0.12)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,oklch(1_0_0_/_0.98)_0%,oklch(0.985_0.01_260_/_0.9)_46%,oklch(0.985_0.012_260_/_0.18)_100%)]" />
          <div className="relative grid min-h-[320px] content-end gap-6 p-6 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end lg:p-10">
            <div className="relative size-32 shrink-0 sm:size-36">
              <img
                src="/avatar.png"
                alt={displayName}
                className="size-full rounded-full object-cover ring-4 ring-card shadow-[0_18px_45px_oklch(0.28_0.04_260_/_0.22)]"
              />
              <button
                type="button"
                aria-label="Đổi ảnh đại diện"
                className="absolute bottom-2 right-1 flex size-10 items-center justify-center rounded-full border border-border bg-card text-primary shadow-lg transition hover:-translate-y-0.5"
              >
                <Camera className="size-5" />
              </button>
            </div>

            <div className="min-w-0 max-w-2xl">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                  {displayName}
                </h1>
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-primary">
                  Vietjourney Explorer
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-muted-foreground">{username}</p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Lưu lại địa điểm hay, biến chúng thành lịch trình rõ ràng, rồi rủ bạn bè cùng
                chốt từng chặng đi khắp Việt Nam.
              </p>
              <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Việt Nam
                </span>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays className="size-4 text-primary" />
                  Thành viên Vietjourney
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:flex-col">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_14px_32px_oklch(0.515_0.22_277_/_0.22)] transition hover:-translate-y-0.5"
              >
                <Pencil className="size-4" />
                Chỉnh sửa hồ sơ
              </button>
              <button
                type="button"
                onClick={onExplore}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card/90 px-5 py-3 text-sm font-bold text-foreground shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-accent hover:text-primary"
              >
                <Compass className="size-4" />
                Khám phá thêm
              </button>
            </div>
          </div>
        </section>

        <section className="-mt-5 relative z-10 grid gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-[0_18px_60px_oklch(0.34_0.04_255_/_0.12)] backdrop-blur sm:grid-cols-2 lg:grid-cols-6">
          <ProfileStat icon={Route} label="Chuyến đi" value={timelines.length} />
          <ProfileStat icon={Bookmark} label="Đã lưu" value={savedPlaces.length} />
          <ProfileStat icon={MapPin} label="Điểm lên lịch" value={plannedPlaces} />
          <ProfileStat icon={Users} label="Bạn đồng hành" value={totalMembers} />
          <ProfileStat icon={Globe2} label="Khu vực" value={savedDistrictCount} />
          <ProfileStat icon={Flame} label="Ngày đi" value={totalDays} />
        </section>

        {error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-white p-5 text-sm text-rose-600 shadow-sm">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-3 text-sm font-semibold text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" />
            Đang tải hồ sơ du lịch...
          </div>
        ) : (
          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
            <section className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex flex-wrap gap-2">
                  {["Chuyến đi của tôi", "Địa điểm đã lưu", "Gợi ý phù hợp", "Hoạt động"].map(
                    (tab, index) => (
                      <button
                        key={tab}
                        type="button"
                        className={cn(
                          "rounded-xl px-4 py-2 text-sm font-bold transition",
                          index === 0
                            ? "bg-accent text-primary"
                            : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                        )}
                      >
                        {tab}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-foreground">Chuyến đi gần đây</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Những lịch trình đang được chuẩn bị hoặc vừa hoàn thành.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExplore}
                  className="hidden rounded-xl border border-border px-4 py-2 text-sm font-bold text-foreground transition hover:bg-accent hover:text-primary sm:inline-flex"
                >
                  Tìm điểm mới
                </button>
              </div>

              {recentTrips.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {recentTrips.map((timeline) => (
                    <TripCard
                      key={timeline.id}
                      timeline={timeline}
                      onOpen={() => onEditTimeline(timeline)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  icon={Route}
                  title="Chưa có chuyến đi"
                  description="Tạo timeline đầu tiên từ các địa điểm bạn đã lưu hoặc bắt đầu khám phá."
                  action="Khám phá địa điểm"
                  onAction={onExplore}
                />
              )}

              <div className="mt-8 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    Địa điểm đã lưu theo nhóm
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Gom nhanh các lựa chọn ăn uống, trải nghiệm và điểm muốn đi.
                  </p>
                </div>
              </div>

              {topSavedGroups.length ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                  {topSavedGroups.map(([category, places]) => (
                    <SavedCollection key={category} category={category} places={places} />
                  ))}
                  <button
                    type="button"
                    onClick={onExplore}
                    className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-primary/40 bg-accent/45 p-5 text-center text-primary transition hover:-translate-y-0.5 hover:bg-accent"
                  >
                    <Plus className="size-8" />
                    <span className="mt-3 text-sm font-black">Lưu thêm địa điểm</span>
                  </button>
                </div>
              ) : (
                <EmptyPanel
                  icon={Bookmark}
                  title="Chưa lưu địa điểm nào"
                  description="Khi bạn lưu địa điểm từ Khám phá, chúng sẽ xuất hiện ở đây để lập lịch nhanh hơn."
                  action="Đi tới Khám phá"
                  onAction={onExplore}
                />
              )}
            </section>

            <aside className="space-y-4">
              <ProfilePanel title="Thành tích" action="Xem tất cả">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-2">
                  <Achievement icon={Award} title="Explorer" subtitle={`${timelines.length} chuyến đi`} />
                  <Achievement icon={Star} title="Curator" subtitle={`${savedPlaces.length} địa điểm`} tone="blue" />
                  <Achievement icon={Trophy} title="Team Planner" subtitle={`${totalMembers} lượt thành viên`} tone="sky" />
                  <Achievement icon={Flame} title="Streak" subtitle={`${totalDays} ngày đi`} tone="indigo" />
                </div>
              </ProfilePanel>

              <ProfilePanel title="Thống kê khám phá">
                <div className="space-y-3">
                  <StatRow label="Tổng chuyến đi" value={timelines.length} />
                  <StatRow label="Địa điểm đã lên lịch" value={plannedPlaces} />
                  <StatRow label="Địa điểm đã lưu" value={savedPlaces.length} />
                  <StatRow label="Khu vực đã quan tâm" value={savedDistrictCount} />
                  <StatRow label="Tổng ngày du lịch" value={`${totalDays} ngày`} />
                </div>
              </ProfilePanel>

              <ProfilePanel title="Hoạt động gần đây" action="Xem tất cả">
                <div className="space-y-3">
                  {notifications.length ? (
                    notifications.slice(0, 4).map((notification) => (
                      <ActivityItem
                        key={notification.id}
                        title={notification.title}
                        detail={notification.message || notification.type}
                        time={relativeTime(notification.createdAt)}
                      />
                    ))
                  ) : recentTrips.length ? (
                    recentTrips.slice(0, 3).map((timeline) => (
                      <ActivityItem
                        key={timeline.id}
                        title={`Đã cập nhật ${timeline.title}`}
                        detail={`${timeline.events.length} điểm trong lịch trình`}
                        time={formatTripRange(timeline)}
                      />
                    ))
                  ) : (
                    <p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                      Hoạt động mới sẽ xuất hiện sau khi bạn tạo chuyến đi hoặc lưu địa điểm.
                    </p>
                  )}
                </div>
              </ProfilePanel>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}

function ProfileStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Route;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2">
      <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-primary">
        <Icon className="size-5" />
      </span>
      <span>
        <strong className="block text-2xl font-black leading-none text-foreground">
          {value}
        </strong>
        <span className="mt-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

function TripCard({ timeline, onOpen }: { timeline: Timeline; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative min-h-52 overflow-hidden rounded-2xl text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      <img
        src={tripCoverImage(timeline)}
        alt={timeline.title}
        className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105"
      />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,transparent_20%,oklch(0.18_0.04_230_/_0.88)_100%)]" />
      <span className="relative flex min-h-52 flex-col justify-end p-4 text-white">
        <strong className="line-clamp-2 text-lg font-black">{timeline.title}</strong>
        <span className="mt-1 text-sm font-medium text-white/85">{formatTripRange(timeline)}</span>
        <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white/85">
          <Users className="size-4" />
          {memberCount(timeline)} thành viên
        </span>
      </span>
    </button>
  );
}

function SavedCollection({ category, places }: { category: string; places: Place[] }) {
  const firstPlace = places[0];

  return (
    <article className="rounded-2xl border border-border bg-background p-3">
      <img
        src={firstPlace ? placeImage(firstPlace) : "/placeholder.svg"}
        alt={categoryLabel(category)}
        className="aspect-square w-full rounded-xl object-cover"
      />
      <h3 className="mt-3 truncate text-sm font-black text-foreground">
        {categoryLabel(category)}
      </h3>
      <p className="mt-1 truncate text-xs font-semibold text-muted-foreground">
        {places.length} địa điểm · {firstPlace ? displayPlaceArea(firstPlace) : "Việt Nam"}
      </p>
    </article>
  );
}

function ProfilePanel({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-base font-black text-foreground">{title}</h2>
        {action ? (
          <button type="button" className="text-xs font-bold text-primary">
            {action}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Achievement({
  icon: Icon,
  title,
  subtitle,
  tone = "primary",
}: {
  icon: typeof Award;
  title: string;
  subtitle: string;
  tone?: "primary" | "blue" | "sky" | "indigo";
}) {
  const tones = {
    primary: "bg-accent text-primary",
    blue: "bg-blue-50 text-blue-700",
    sky: "bg-sky-50 text-sky-700",
    indigo: "bg-indigo-50 text-indigo-700",
  };

  return (
    <div className="rounded-2xl border border-border p-3 text-center">
      <span className={cn("mx-auto flex size-12 items-center justify-center rounded-2xl", tones[tone])}>
        <Icon className="size-6" />
      </span>
      <h3 className="mt-2 text-sm font-black text-foreground">{title}</h3>
      <p className="mt-1 text-xs font-semibold text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <strong className="font-black text-slate-900">{value}</strong>
    </div>
  );
}

function ActivityItem({
  title,
  detail,
  time,
}: {
  title: string;
  detail: string;
  time: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl p-2 transition hover:bg-slate-50">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
        <UserRound className="size-5" />
      </span>
      <span className="min-w-0">
        <strong className="block truncate text-sm font-black text-foreground">{title}</strong>
        <span className="mt-0.5 block line-clamp-1 text-xs text-muted-foreground">{detail}</span>
        <span className="mt-1 block text-xs font-semibold text-slate-400">{time}</span>
      </span>
    </div>
  );
}

function EmptyPanel({
  icon: Icon,
  title,
  description,
  action,
  onAction,
}: {
  icon: typeof Bookmark;
  title: string;
  description: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-primary/40 bg-accent/35 p-8 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-card text-primary shadow-sm">
        <Icon className="size-7" />
      </span>
      <h3 className="mt-4 text-lg font-black text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="mt-5 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5"
      >
        {action}
      </button>
    </div>
  );
}
