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
  Archive,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import {
  archiveCommunityPost,
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

const fallbackImage = "https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=600&auto=format&fit=crop";
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
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [commentsPost, setCommentsPost] = useState<CommunityPost | null>(null);

  async function load(signal?: AbortSignal, isLoadMore = false) {
    if (!isLoadMore) {
      setLoading(true);
      setPage(0);
    }
    setError(null);

    try {
      const [pageResult, nextSummary] = await Promise.all([
        fetchCommunityPosts(
          {
            tab,
            query,
            tags: activeTags,
            page: isLoadMore ? page + 1 : 0,
            size: 12,
          },
          signal,
        ),
        !isLoadMore ? fetchCommunitySummary(signal).catch(() => null) : Promise.resolve(summary),
      ]);
      
      if (isLoadMore) {
        setPosts((current) => [...current, ...pageResult.content]);
        setPage((p) => p + 1);
      } else {
        setPosts(pageResult.content);
        setSummary(nextSummary);
      }
      setHasMore(!pageResult.last);
    } catch (loadError) {
      if (signal?.aborted) return;
      setError(loadError instanceof Error ? loadError.message : "Không tải được cộng đồng.");
      if (!isLoadMore) setPosts([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void load(controller.signal, false);
    }, query ? 260 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [tab, query, activeTags]);

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

  async function runPostAction(postId: string, action: () => Promise<CommunityPost>, optimisticPost?: CommunityPost) {
    setActionId(postId);
    setError(null);
    const originalPost = posts.find(p => p.id === postId);
    if (optimisticPost) replacePost(optimisticPost);
    try {
      replacePost(await action());
    } catch (actionError) {
      if (originalPost) replacePost(originalPost);
      setError(actionError instanceof Error ? actionError.message : "Thao tác cộng đồng thất bại.");
      toast.error("Thao tác thất bại.");
    } finally {
      setActionId(null);
    }
  }

  async function archivePostAction(post: CommunityPost) {
    if (!window.confirm("Bạn có chắc muốn lưu trữ bài viết này?")) return;
    setActionId(post.id);
    setError(null);
    setPosts(current => current.filter(p => p.id !== post.id));
    try {
      await archiveCommunityPost(post.id);
      toast.success("Đã lưu trữ bài viết.");
    } catch (archiveError) {
      setPosts(current => [post, ...current]);
      toast.error("Lưu trữ thất bại.");
      setError(archiveError instanceof Error ? archiveError.message : "Lưu trữ thất bại.");
    } finally {
      setActionId(null);
    }
  }

  async function copyTimeline(post: CommunityPost) {
    if (!window.confirm("Bạn muốn sao chép lịch trình này về trang của mình?")) return;
    setActionId(`copy:${post.id}`);
    setError(null);
    try {
      const timeline = await copyCommunityTimeline(post.id);
      replacePost({ ...post, copyCount: post.copyCount + 1 });
      toast.success("Sao chép thành công!");
      onOpenTimeline?.(timeline);
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : "Không sao chép được lịch trình.");
      toast.error("Sao chép thất bại.");
    } finally {
      setActionId(null);
    }
  }

  async function followAuthor(author: CommunityAuthor) {
    setActionId(`author:${author.id}`);
    setError(null);
    
    // Optimistic Update
    const isFollowing = !author.followedByMe;
    const authorUpdater = (a: CommunityAuthor) => a.id === author.id ? { ...a, followedByMe: isFollowing, followerCount: a.followerCount + (isFollowing ? 1 : -1) } : a;
    
    setPosts(current => current.map(p => ({ ...p, author: authorUpdater(p.author) })));
    setSummary(current => current ? {
      ...current,
      featuredCreators: current.featuredCreators.map(authorUpdater),
      hotTimelines: current.hotTimelines.map(p => ({ ...p, author: authorUpdater(p.author) }))
    } : current);

    try {
      await toggleCommunityFollow(author.id);
    } catch (followError) {
      // Rollback
      const revertFollowing = !isFollowing;
      const revertUpdater = (a: CommunityAuthor) => a.id === author.id ? { ...a, followedByMe: revertFollowing, followerCount: a.followerCount + (revertFollowing ? 1 : -1) } : a;
      setPosts(current => current.map(p => ({ ...p, author: revertUpdater(p.author) })));
      setSummary(current => current ? {
        ...current,
        featuredCreators: current.featuredCreators.map(revertUpdater),
        hotTimelines: current.hotTimelines.map(p => ({ ...p, author: revertUpdater(p.author) }))
      } : current);
      
      setError(followError instanceof Error ? followError.message : "Không cập nhật theo dõi được.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <main className="min-w-0 flex-1 overflow-y-auto bg-background text-foreground">
      <div className="grid min-h-full xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 border-r border-border px-5 pb-8 pt-6 lg:px-8">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Cộng đồng</h1>
              <div className="mt-5 flex gap-8 border-b border-border">
                <TabButton active={tab === "FOR_YOU"} onClick={() => setTab("FOR_YOU")}>
                  Dành cho bạn
                </TabButton>
                <TabButton active={tab === "FOLLOWING"} onClick={() => setTab("FOLLOWING")}>
                  Đang theo dõi
                </TabButton>
              </div>
            </div>

            <div className="flex min-w-[min(100%,520px)] flex-1 items-center justify-end gap-3">
              <div className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-card px-4 shadow-sm">
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Tìm timeline, điểm đến, tag..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                <kbd className="hidden rounded-lg border border-border bg-background px-2 py-1 text-xs text-muted-foreground sm:inline-flex">
                  ⌘ K
                </kbd>
              </div>
              <button
                type="button"
                onClick={() => setActiveTags([])}
                className={cn(
                  "flex h-12 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold shadow-sm transition-colors",
                  activeTags.length
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:bg-accent",
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

          {activeTags.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
              <span className="font-semibold">Đang lọc theo:</span>
              {activeTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-xs font-bold text-foreground">
                  #{tag}
                  <button type="button" onClick={() => setActiveTags((prev) => prev.filter((t) => t !== tag))} className="hover:text-primary">
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => setActiveTags([])} className="ml-auto text-xs font-bold underline hover:text-primary">
                Xóa bộ lọc
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
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
                  onTagClick={(tag) => setActiveTags((prev) => (prev.includes(normalizeTag(tag)) ? prev.filter((t) => t !== normalizeTag(tag)) : [...prev, normalizeTag(tag)]))}
                  onLike={() => void runPostAction(post.id, () => toggleCommunityLike(post.id), { ...post, likedByMe: !post.likedByMe, likeCount: post.likeCount + (post.likedByMe ? -1 : 1) })}
                  onSave={() => void runPostAction(post.id, () => toggleCommunitySave(post.id), { ...post, savedByMe: !post.savedByMe, saveCount: post.saveCount + (post.savedByMe ? -1 : 1) })}
                  onRate={(rating) => {
                    if (post.myRating && post.myRating > 0) return;
                    void runPostAction(post.id, () => rateCommunityPost(post.id, rating), { ...post, myRating: rating, ratingCount: post.ratingCount + 1, ratingAverage: (post.ratingAverage * post.ratingCount + rating) / (post.ratingCount + 1) });
                  }}
                  onCopy={() => void copyTimeline(post)}
                  onComment={() => setCommentsPost(post)}
                  onArchive={() => void archivePostAction(post)}
                />
              ))}
              {hasMore && (
                <button
                  type="button"
                  onClick={() => void load(undefined, true)}
                  disabled={loading}
                  className="mt-4 flex w-full items-center justify-center rounded-2xl border border-border bg-card py-3 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-accent disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Tải thêm"}
                </button>
              )}
            </div>
          ) : (
            <EmptyCommunityState onShare={() => setShareOpen(true)} />
          )}
        </section>

        <aside className="hidden space-y-4 px-5 pb-8 pt-8 xl:block">
          <TrendingTags tags={summary?.trendingTags || []} onSelectTag={(tag) => setActiveTags((prev) => (prev.includes(normalizeTag(tag)) ? prev.filter((t) => t !== normalizeTag(tag)) : [...prev, normalizeTag(tag)]))} />
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
          onCommented={() => replacePost({ ...commentsPost, commentCount: commentsPost.commentCount + 1 })}
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
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active ? <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
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
  onArchive?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const images = post.images.length ? post.images : [fallbackImage];

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-3 px-5 pt-5">
        <Avatar author={post.author} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-foreground">{authorName(post.author)}</span>
            {post.author.verified ? <CheckCircle2 className="size-4 fill-blue-600 text-white" /> : null}
            <span className="text-sm text-muted-foreground">@{post.author.username}</span>
            <span className="text-sm text-muted-foreground/70">·</span>
            <span className="text-sm text-muted-foreground">{relativeTime(post.createdAt)}</span>
          </div>
          {post.caption ? <p className="mt-1 text-sm leading-relaxed text-foreground/80">{post.caption}</p> : null}
        </div>
        <div className="relative">
          <button type="button" onClick={() => setShowMenu(!showMenu)} aria-label="Tùy chọn bài viết" className="rounded-xl p-2 text-muted-foreground hover:bg-accent">
            <MoreHorizontal className="size-5" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-2xl border border-border bg-card py-1 shadow-lg">
              {post.author.id === post.currentUserId ? (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    onArchive?.();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/10"
                >
                  <Archive className="size-4" />
                  Lưu trữ bài viết
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    toast.info("Đã gửi báo cáo vi phạm.");
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
                >
                  <Flag className="size-4" />
                  Báo cáo vi phạm
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.9fr)]">
        <ImageGrid images={images} />
        <div className="flex min-w-0 flex-col justify-center">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-foreground">{post.title}</h2>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              {post.ratingAverage.toFixed(1)}
              <span className="font-normal text-muted-foreground">({post.ratingCount} đánh giá)</span>
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-background/70">
            {post.itinerary.length ? (
              post.itinerary.slice(0, 3).map((day) => (
                <div key={day.day} className="grid grid-cols-[76px_minmax(0,1fr)] gap-3 border-b border-border px-3 py-3 last:border-b-0">
                  <span className="flex h-8 items-center justify-center rounded-xl border border-primary/20 bg-card text-sm font-semibold text-primary">
                    Ngày {day.day}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground">{day.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{day.summary || "Chưa có mô tả"}</span>
                  </span>
                </div>
              ))
            ) : (
              <div className="p-4 text-sm text-muted-foreground">Timeline này chưa có hoạt động chi tiết.</div>
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
            className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            #{tag}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
        <MetricButton active={post.likedByMe} icon={Heart} label={formatCount(post.likeCount)} onClick={onLike} />
        <MetricButton icon={MessageCircle} label={formatCount(post.commentCount)} onClick={onComment} />
        <MetricButton active={post.savedByMe} icon={Bookmark} label={formatCount(post.saveCount)} onClick={onSave} />
        <div className="flex items-center gap-1 px-2">
          {[1, 2, 3, 4, 5].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onRate(rating)}
              className="text-muted-foreground/40 transition-colors hover:text-amber-400"
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
          className="ml-auto flex h-10 min-w-56 items-center justify-center gap-2 rounded-xl border border-primary px-5 text-sm font-bold text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-5" />}
          Sao chép lịch trình
        </button>
        <button type="button" className="flex size-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent">
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
        <div key={index} className="relative overflow-hidden bg-muted">
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
        active ? "text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className={cn("size-5", active && Icon === Heart ? "fill-blue-600" : "")} />
      {label}
    </button>
  );
}

function Avatar({ author }: { author: CommunityAuthor }) {
  return (
    <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary/25 to-accent text-sm font-bold text-primary">
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
            className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/30 hover:bg-accent"
          >
            <span className="font-semibold text-primary">#{item.tag}</span>
            <span className="text-xs text-muted-foreground">{formatCount(item.count)}</span>
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
                  <p className="truncate text-sm font-bold text-foreground">{authorName(author)}</p>
                  {author.verified ? <CheckCircle2 className="size-3.5 fill-blue-600 text-white" /> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">@{author.username}</p>
              </div>
              <button
                type="button"
                disabled={busyId === author.id}
                onClick={() => onFollow(author)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-60",
                  author.followedByMe ? "border-border text-muted-foreground" : "border-primary/30 text-primary hover:bg-primary/10",
                )}
              >
                {busyId === author.id ? "..." : author.followedByMe ? "Đang theo dõi" : "Theo dõi"}
              </button>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-background/70 p-4 text-sm text-muted-foreground">Chưa có nhà sáng tạo nổi bật.</p>
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
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {index + 1}
              </span>
              <img src={post.images[0] || fallbackImage} alt={post.title} className="size-16 rounded-xl object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">{post.title}</span>
                <span className="mt-1 block truncate text-xs text-muted-foreground">{authorName(post.author)}</span>
                <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                  {post.ratingAverage.toFixed(1)}
                  <span>{formatCount(post.copyCount)} sao chép</span>
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="rounded-xl bg-background/70 p-4 text-sm text-muted-foreground">Chưa có timeline hot.</p>
        )}
      </div>
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-bold text-foreground">{title}</h2>
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
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : (
        <div className="mt-6 space-y-4">
          {error ? <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Timeline</span>
            <select
              value={timelineId}
              onChange={(event) => setTimelineId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            >
              {timelines.map((timeline) => (
                <option key={timeline.id} value={timeline.id}>
                  {timeline.title}
                </option>
              ))}
            </select>
          </label>
          {selectedTimeline ? (
            <div className="flex gap-3 rounded-2xl border border-border bg-background/70 p-3">
              <img src={tripCoverImage(selectedTimeline)} alt={selectedTimeline.title} className="size-20 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate font-bold text-foreground">{selectedTimeline.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTimeline.events.length} hoạt động · {selectedTimeline.members.length} thành viên
                </p>
              </div>
            </div>
          ) : null}
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Mô tả chia sẻ</span>
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Kể một chút về chuyến đi này..."
              className="mt-2 min-h-28 w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-foreground">Tag</span>
            <input
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              placeholder="Danang, AmThuc, 3N2D"
              className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
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
        {error ? <div className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</div> : null}
        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-muted" />
        ) : comments.length ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 rounded-2xl bg-background/70 p-3">
              <Avatar author={comment.author} />
              <div>
                <p className="text-sm font-bold text-foreground">{authorName(comment.author)}</p>
                <p className="mt-1 text-sm text-foreground/80">{comment.content}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-background/70 p-4 text-sm text-muted-foreground">Chưa có bình luận nào.</p>
        )}
        <div className="flex gap-2 pt-2">
          <input
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Viết bình luận..."
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
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
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-accent">
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
        <div key={index} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
      ))}
    </div>
  );
}

function EmptyCommunityState({ onShare }: { onShare: () => void }) {
  return (
    <div className="mt-8 rounded-2xl border border-dashed border-primary/25 bg-card p-10 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Users className="size-7" />
      </div>
      <h2 className="mt-5 text-xl font-bold text-foreground">Chưa có timeline cộng đồng</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
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
