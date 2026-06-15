import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CheckCircle2,
  Copy,
  Edit3,
  Filter,
  Heart,
  Image,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import {
  copyCommunityTimeline,
  createCommunityComment,
  createCommunityPost,
  fetchCommunityComments,
  fetchCommunityPosts,
  fetchCommunitySummary,
  rateCommunityPost,
  toggleCommunityFollow,
  toggleCommunityLike,
  toggleCommunitySave,
  type CommunityAuthor,
  type CommunityComment,
  type CommunityPost,
  type CommunitySummary,
} from "../lib/communityApi";
import { fetchMyTimelines, tripCoverImage, type Timeline } from "../lib/timelineApi";
import { cn } from "../lib/utils";

type FeedTab = "FOR_YOU" | "FOLLOWING";

interface CommunityPageProps {
  onOpenTimeline?: (timeline: Timeline) => void;
}

const fallbackImage = "/placeholder.svg";
const suggestedTags = ["Danang", "AmThuc", "Bien", "3N2D", "DaLat", "HoiAn"];

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function relativeTime(value: string) {
  const diffMinutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (diffMinutes < 1) return "vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ`;
  return `${Math.round(diffHours / 24)} ngày`;
}

function authorName(author: CommunityAuthor) {
  return author.displayName || author.username;
}

function initial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "V";
}

function normalizeTag(tag: string) {
  return tag.replace(/^#/, "");
}

export function CommunityPage({ onOpenTimeline }: CommunityPageProps) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [summary, setSummary] = useState<CommunitySummary | null>(null);
  const [tab, setTab] = useState<FeedTab>("FOR_YOU");
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsPost, setCommentsPost] = useState<CommunityPost | null>(null);

  async function load(signal?: AbortSignal) {
    setLoading(true);
    setError(null);

    try {
      const [page, nextSummary] = await Promise.all([
        fetchCommunityPosts(
          {
            tab,
            query,
            tag: activeTag || undefined,
            page: 0,
            size: 12,
          },
          signal,
        ),
        fetchCommunitySummary(signal).catch(() => null),
      ]);
      setPosts(page.content);
      setSummary(nextSummary);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Không tải được cộng đồng.");
      setPosts([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal);
    }, query ? 260 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [tab, query, activeTag]);

  function replacePost(nextPost: CommunityPost) {
    setPosts((currentPosts) => currentPosts.map((post) => (post.id === nextPost.id ? nextPost : post)));
    setSummary((currentSummary) =>
      currentSummary
        ? {
            ...currentSummary,
            hotTimelines: currentSummary.hotTimelines.map((post) => (post.id === nextPost.id ? nextPost : post)),
          }
        : currentSummary,
    );
  }

  async function runPostAction(postId: string, action: () => Promise<CommunityPost>) {
    setActionId(postId);
    setError(null);
    try {
      replacePost(await action());
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Thao tác cộng đồng thất bại.");
    } finally {
      setActionId(null);
    }
  }

  async function copyTimeline(post: CommunityPost) {
    setActionId(`copy:${post.id}`);
    setError(null);
    try {
      const timeline = await copyCommunityTimeline(post.id);
      await load();
      onOpenTimeline?.(timeline);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Không sao chép được lịch trình.");
    } finally {
      setActionId(null);
    }
  }

  async function followAuthor(author: CommunityAuthor) {
    setActionId(`author:${author.id}`);
    setError(null);
    try {
      await toggleCommunityFollow(author.id);
      await load();
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "Không cập nhật theo dõi được.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-[#f7f9fc] text-slate-950">
      <div className="grid min-h-full xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 border-r border-slate-200/80 px-5 pb-8 pt-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950">Cộng đồng</h1>
              <div className="mt-5 flex gap-8 border-b border-slate-200">
                <TabButton active={tab === "FOR_YOU"} onClick={() => setTab("FOR_YOU")}>
                  Dành cho bạn
                </TabButton>
                <TabButton active={tab === "FOLLOWING"} onClick={() => setTab("FOLLOWING")}>
                  Đang theo dõi
                </TabButton>
              </div>
            </div>

            <div className="flex min-w-[min(100%,520px)] flex-1 items-center justify-end gap-3">
              <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <Search className="size-5 shrink-0 text-slate-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm timeline, điểm đến, tag..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                />
                <kbd className="hidden rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-400 sm:inline-flex">
                  ⌘ K
                </kbd>
              </div>
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className={cn(
                  "flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold shadow-sm transition-colors",
                  activeTag ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                )}
              >
                <Filter className="size-4" />
                Bộ lọc
              </button>
              <button
                type="button"
                aria-label="Chia sẻ timeline"
                onClick={() => setShareOpen(true)}
                className="flex size-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_14px_30px_rgb(37_99_235_/_0.25)] transition-transform hover:-translate-y-0.5"
              >
                <Edit3 className="size-5" />
              </button>
            </div>
          </header>

          {activeTag ? (
            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Đang lọc theo #{activeTag}
              <button type="button" onClick={() => setActiveTag(null)} className="ml-auto rounded-lg p-1 hover:bg-blue-100">
                <X className="size-4" />
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <FeedSkeleton />
          ) : posts.length ? (
            <div className="mt-5 space-y-4">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  busy={actionId === post.id || actionId === `copy:${post.id}`}
                  onTagClick={(tag) => setActiveTag(normalizeTag(tag))}
                  onLike={() => void runPostAction(post.id, () => toggleCommunityLike(post.id))}
                  onSave={() => void runPostAction(post.id, () => toggleCommunitySave(post.id))}
                  onRate={(rating) => void runPostAction(post.id, () => rateCommunityPost(post.id, rating))}
                  onCopy={() => void copyTimeline(post)}
                  onComment={() => setCommentsPost(post)}
                />
              ))}
            </div>
          ) : (
            <EmptyCommunityState onShare={() => setShareOpen(true)} />
          )}
        </section>

        <aside className="hidden space-y-4 px-5 pb-8 pt-8 xl:block">
          <TrendingTags tags={summary?.trendingTags || []} onSelectTag={setActiveTag} />
          <FeaturedCreators
            creators={summary?.featuredCreators || []}
            busyId={actionId?.startsWith("author:") ? actionId.replace("author:", "") : null}
            onFollow={(author) => void followAuthor(author)}
          />
          <HotTimelines posts={summary?.hotTimelines || []} onCopy={(post) => void copyTimeline(post)} />
        </aside>
      </div>

      {shareOpen ? (
        <ShareTimelineModal
          onClose={() => setShareOpen(false)}
          onCreated={(post) => {
            setShareOpen(false);
            setPosts((currentPosts) => [post, ...currentPosts]);
            void load();
          }}
        />
      ) : null}

      {commentsPost ? (
        <CommentsModal
          post={commentsPost}
          onClose={() => setCommentsPost(null)}
          onCommented={() => void load()}
        />
      ) : null}
    </main>
  );
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative pb-3 text-sm font-semibold transition-colors",
        active ? "text-blue-600" : "text-slate-500 hover:text-slate-900",
      )}
    >
      {children}
      {active ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-blue-600" /> : null}
    </button>
  );
}

function CommunityPostCard({
  post,
  busy,
  onTagClick,
  onLike,
  onSave,
  onRate,
  onCopy,
  onComment,
}: {
  post: CommunityPost;
  busy: boolean;
  onTagClick: (tag: string) => void;
  onLike: () => void;
  onSave: () => void;
  onRate: (rating: number) => void;
  onCopy: () => void;
  onComment: () => void;
}) {
  const images = post.images.length ? post.images : [fallbackImage];

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start gap-3 px-5 pt-5">
        <Avatar author={post.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-950">{authorName(post.author)}</span>
            {post.author.verified ? <CheckCircle2 className="size-4 fill-blue-600 text-white" /> : null}
            <span className="text-sm text-slate-500">@{post.author.username}</span>
            <span className="text-sm text-slate-400">·</span>
            <span className="text-sm text-slate-500">{relativeTime(post.createdAt)}</span>
          </div>
          {post.caption ? <p className="mt-1 text-sm leading-relaxed text-slate-700">{post.caption}</p> : null}
        </div>
        <button type="button" aria-label="Tùy chọn bài viết" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <ImageGrid images={images} />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-950">{post.title}</h2>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {post.ratingAverage.toFixed(1)}
              <span className="font-normal text-slate-500">({post.ratingCount} đánh giá)</span>
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {post.itinerary.length ? (
              post.itinerary.slice(0, 3).map((day) => (
                <div key={day.day} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-slate-200 px-3 py-3 last:border-b-0">
                  <span className="flex h-8 items-center justify-center rounded-xl border border-blue-100 bg-white text-sm font-semibold text-blue-600">
                    Ngày {day.day}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-900">{day.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">{day.summary || "Chưa có mô tả"}</span>
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-slate-500">Timeline này chưa có hoạt động chi tiết.</div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {post.tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagClick(tag)}
            className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3">
        <MetricButton active={post.likedByMe} icon={Heart} label={formatCount(post.likeCount)} onClick={onLike} />
        <MetricButton icon={MessageCircle} label={formatCount(post.commentCount)} onClick={onComment} />
        <MetricButton active={post.savedByMe} icon={Bookmark} label={formatCount(post.saveCount)} onClick={onSave} />
        <div className="flex items-center gap-1 px-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onRate(rating)}
              className="text-slate-300 transition-colors hover:text-amber-400"
              aria-label={`Đánh giá ${rating} sao`}
            >
              <Star className={cn("size-4", rating <= Math.round(post.ratingAverage) ? "fill-amber-400 text-amber-400" : "")} />
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onCopy}
          className="ml-auto flex h-10 min-w-56 items-center justify-center gap-2 rounded-xl border border-blue-600 px-5 text-sm font-bold text-blue-600 transition-colors hover:bg-blue-50 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-5" />}
          Sao chép lịch trình
        </button>
        <button type="button" className="flex size-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
          <Share2 className="size-5" />
        </button>
      </div>
    </article>
  );
}

function ImageGrid({ images }: { images: string[] }) {
  return (
    <div className="grid h-56 grid-cols-[2fr_0.8fr_0.8fr] grid-rows-2 gap-1.5 overflow-hidden rounded-2xl">
      <img src={images[0] || fallbackImage} alt="Ảnh timeline" className="row-span-2 size-full object-cover" />
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="relative overflow-hidden bg-slate-100">
          <img src={images[index] || images[0] || fallbackImage} alt="Ảnh timeline" className="size-full object-cover" />
          {index === 4 ? (
            <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-slate-950/75 px-2 py-1 text-xs font-semibold text-white">
              <Image className="size-3.5" />
              {Math.max(images.length, 1)} ảnh
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function MetricButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Heart;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-24 items-center gap-2 rounded-xl px-2 text-sm transition-colors",
        active ? "text-blue-600" : "text-slate-600 hover:bg-slate-100",
      )}
    >
      <Icon className={cn("size-5", active && Icon === Heart ? "fill-blue-600" : "")} />
      {label}
    </button>
  );
}

function Avatar({ author }: { author: CommunityAuthor }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-sky-100 text-sm font-bold text-blue-700">
      {initial(authorName(author))}
    </span>
  );
}

function TrendingTags({ tags, onSelectTag }: { tags: CommunitySummary["trendingTags"]; onSelectTag: (tag: string) => void }) {
  const displayTags = tags.length ? tags : suggestedTags.map((tag, index) => ({ tag, count: [12600, 9800, 7200, 6100, 5400, 4300][index] }));

  return (
    <Panel title="Tag nổi bật">
      <div className="grid grid-cols-2 gap-2">
        {displayTags.slice(0, 10).map((item) => (
          <button
            key={item.tag}
            type="button"
            onClick={() => onSelectTag(item.tag)}
            className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-left text-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
          >
            <span className="font-semibold text-blue-600">#{item.tag}</span>
            <span className="text-xs text-slate-500">{formatCount(item.count)}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function FeaturedCreators({
  creators,
  busyId,
  onFollow,
}: {
  creators: CommunityAuthor[];
  busyId: string | null;
  onFollow: (author: CommunityAuthor) => void;
}) {
  return (
    <Panel title="Nhà sáng tạo nổi bật">
      <div className="space-y-4">
        {creators.length ? (
          creators.slice(0, 4).map((author) => (
            <div key={author.id} className="flex items-center gap-3">
              <Avatar author={author} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="truncate text-sm font-bold text-slate-950">{authorName(author)}</p>
                  {author.verified ? <CheckCircle2 className="size-3.5 fill-blue-600 text-white" /> : null}
                </div>
                <p className="truncate text-xs text-slate-500">@{author.username}</p>
              </div>
              <button
                type="button"
                disabled={busyId === author.id}
                onClick={() => onFollow(author)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-60",
                  author.followedByMe ? "border-slate-200 text-slate-600" : "border-blue-300 text-blue-600 hover:bg-blue-50",
                )}
              >
                {busyId === author.id ? "..." : author.followedByMe ? "Đang theo dõi" : "Theo dõi"}
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có nhà sáng tạo nổi bật.</p>
        )}
      </div>
    </Panel>
  );
}

function HotTimelines({ posts, onCopy }: { posts: CommunityPost[]; onCopy: (post: CommunityPost) => void }) {
  return (
    <Panel title="Timeline hot tuần này">
      <div className="space-y-4">
        {posts.length ? (
          posts.slice(0, 3).map((post, index) => (
            <button key={post.id} type="button" onClick={() => onCopy(post)} className="flex w-full items-center gap-3 text-left">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-bold text-blue-600">
                {index + 1}
              </span>
              <img src={post.images[0] || fallbackImage} alt={post.title} className="size-16 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-slate-950">{post.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">{authorName(post.author)}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {post.ratingAverage.toFixed(1)}
                  <span>{formatCount(post.copyCount)} sao chép</span>
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có timeline hot.</p>
        )}
      </div>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-slate-950">{title}</h2>
        <button type="button" className="text-xs font-semibold text-blue-600 hover:underline">
          Xem tất cả
        </button>
      </div>
      {children}
    </section>
  );
}

function ShareTimelineModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (post: CommunityPost) => void;
}) {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [timelineId, setTimelineId] = useState("");
  const [caption, setCaption] = useState("");
  const [tagText, setTagText] = useState("Danang, AmThuc, 3N2D");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchMyTimelines(controller.signal)
      .then((nextTimelines) => {
        setTimelines(nextTimelines);
        setTimelineId(nextTimelines[0]?.id || "");
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không tải được timeline."))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const selectedTimeline = timelines.find((timeline) => timeline.id === timelineId);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const post = await createCommunityPost({
        timelineId,
        caption,
        tags: tagText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      });
      onCreated(post);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không chia sẻ được timeline.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Chia sẻ timeline" onClose={onClose}>
      {loading ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-slate-100" />
      ) : (
        <div className="mt-6 space-y-4">
          {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Timeline</span>
            <select
              value={timelineId}
              onChange={(event) => setTimelineId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {timelines.map((timeline) => (
                <option key={timeline.id} value={timeline.id}>
                  {timeline.title}
                </option>
              ))}
            </select>
          </label>
          {selectedTimeline ? (
            <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <img src={tripCoverImage(selectedTimeline)} alt={selectedTimeline.title} className="size-20 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-950">{selectedTimeline.title}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTimeline.events.length} hoạt động · {selectedTimeline.members.length} thành viên
                </p>
              </div>
            </div>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Mô tả chia sẻ</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kể một chút về chuyến đi này..."
              className="mt-2 min-h-28 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-slate-800">Tag</span>
            <input
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="Danang, AmThuc, 3N2D"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </label>
          <button
            type="button"
            disabled={!timelineId || submitting}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Chia sẻ lên cộng đồng
          </button>
        </div>
      )}
    </ModalFrame>
  );
}

function CommentsModal({
  post,
  onClose,
  onCommented,
}: {
  post: CommunityPost;
  onClose: () => void;
  onCommented: () => void;
}) {
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCommunityComments(post.id, controller.signal)
      .then(setComments)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Không tải được bình luận."))
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [post.id]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const comment = await createCommunityComment(post.id, content);
      setComments((currentComments) => [...currentComments, comment]);
      setContent("");
      onCommented();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không gửi được bình luận.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Bình luận" subtitle={post.title} onClose={onClose}>
      <div className="mt-5 space-y-3">
        {error ? <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        ) : comments.length ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-2xl bg-slate-50 p-3">
              <Avatar author={comment.author} />
              <div>
                <p className="text-sm font-bold text-slate-950">{authorName(comment.author)}</p>
                <p className="mt-1 text-sm text-slate-700">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">Chưa có bình luận nào.</p>
        )}
        <div className="flex gap-2 pt-2">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Viết bình luận..."
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            type="button"
            disabled={!content.trim() || submitting}
            onClick={() => void submit()}
            className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-60"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

function ModalFrame({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-950">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
            <X className="size-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="mt-5 space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

function EmptyCommunityState({ onShare }: { onShare: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-blue-200 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Users className="size-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-slate-950">Chưa có timeline cộng đồng</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Chia sẻ timeline đầu tiên để mọi người khám phá, lưu lại và sao chép lịch trình của bạn.
      </p>
      <button
        type="button"
        onClick={onShare}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white"
      >
        <Plus className="size-4" />
        Chia sẻ timeline
      </button>
    </div>
  );
}
