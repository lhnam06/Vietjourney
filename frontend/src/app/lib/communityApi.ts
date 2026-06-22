const _getApiBase = () => (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
import { getAuthToken } from "./authApi";
import { invalidateReadCacheKey, invalidateReadCachePrefix, readThroughCache } from "./readCache";
import { readCacheKeys, readCachePrefixes } from "./readCacheKeys";
import type { Timeline } from "./timelineApi";

interface ApiResponse<T> {
  code: number;
  message?: string;
  result: T;
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface CommunityAuthor {
  id: string;
  username: string;
  displayName?: string | null;
  verified: boolean;
  followedByMe: boolean;
  followerCount: number;
  postCount: number;
}

export interface CommunityItineraryDay {
  day: number;
  title: string;
  summary: string;
}

export interface CommunityPost {
  id: string;
  timelineId: string;
  title: string;
  caption?: string | null;
  startDate: string;
  endDate: string;
  author: CommunityAuthor;
  tags: string[];
  images: string[];
  itinerary: CommunityItineraryDay[];
  likeCount: number;
  commentCount: number;
  saveCount: number;
  copyCount: number;
  ratingAverage: number;
  ratingCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
  myRating?: number;
  currentUserId?: string;
  createdAt: string;
}

export interface CommunityComment {
  id: string;
  author: CommunityAuthor;
  content: string;
  createdAt: string;
}

export interface CommunityTag {
  tag: string;
  count: number;
}

export interface CommunitySummary {
  trendingTags: CommunityTag[];
  featuredCreators: CommunityAuthor[];
  hotTimelines: CommunityPost[];
}

export interface CommunityPostInput {
  timelineId: string;
  caption?: string;
  tags?: string[];
}

export interface CommunityFeedQuery {
  tab?: "FOR_YOU" | "FOLLOWING";
  query?: string;
  tags?: string[];
  page?: number;
  size?: number;
}

const COMMUNITY_POSTS_CACHE_TTL_MS = 20_000;
const COMMUNITY_SUMMARY_CACHE_TTL_MS = 60_000;

function authHeaders(body?: boolean) {
  const token = getAuthToken();
  return {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
}

function invalidateCommunityReadCaches() {
  invalidateReadCacheKey(readCacheKeys.communitySummary());
  invalidateReadCachePrefix(readCachePrefixes.communityPosts);
}

function invalidateTimelineListReadCaches() {
  invalidateReadCacheKey(readCacheKeys.timelines());
}

async function apiFetch<T>(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const response = await fetch(path.startsWith("/") ? _getApiBase() + path : _getApiBase() + "/" + path, {
    ...init,
    signal,
    headers: {
      ...authHeaders(Boolean(init.body)),
      ...(init.headers || {}),
    },
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.message || `Yêu cầu cộng đồng thất bại (${response.status})`);
  }

  if (!payload) {
    throw new Error("Backend không trả về dữ liệu cộng đồng hợp lệ.");
  }

  return payload.result;
}

export function fetchCommunityPosts(query: CommunityFeedQuery = {}, signal?: AbortSignal) {
  const tags = normalizeTags(query.tags);
  const params = new URLSearchParams();
  params.set("tab", query.tab || "FOR_YOU");
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 10));
  if (query.query?.trim()) {
    params.set("query", query.query.trim());
  }
  for (const tag of tags) {
    params.append("tag", tag);
  }

  return readThroughCache({
    key: readCacheKeys.communityPosts({ ...query, tags }),
    ttlMs: COMMUNITY_POSTS_CACHE_TTL_MS,
    signal,
    loader: () => apiFetch<SpringPage<CommunityPost>>(`/api/v1/community/posts?${params.toString()}`),
  });
}

export function fetchCommunitySummary(signal?: AbortSignal) {
  return readThroughCache({
    key: readCacheKeys.communitySummary(),
    ttlMs: COMMUNITY_SUMMARY_CACHE_TTL_MS,
    signal,
    loader: () => apiFetch<CommunitySummary>("/api/v1/community/summary"),
  });
}

export function createCommunityPost(input: CommunityPostInput) {
  return apiFetch<CommunityPost>("/api/v1/community/posts", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function toggleCommunityLike(postId: string) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/like`, {
    method: "POST",
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function toggleCommunitySave(postId: string) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/save`, {
    method: "POST",
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function rateCommunityPost(postId: string, rating: number) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/rating`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function fetchCommunityComments(postId: string, signal?: AbortSignal) {
  return apiFetch<CommunityComment[]>(`/api/v1/community/posts/${postId}/comments`, {}, signal);
}

export function createCommunityComment(postId: string, content: string) {
  return apiFetch<CommunityComment>(`/api/v1/community/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function copyCommunityTimeline(postId: string) {
  return apiFetch<Timeline>(`/api/v1/community/posts/${postId}/copy`, {
    method: "POST",
  }).then((result) => {
    invalidateCommunityReadCaches();
    invalidateTimelineListReadCaches();
    return result;
  });
}

export function toggleCommunityFollow(authorId: string) {
  return apiFetch<CommunityAuthor>(`/api/v1/community/authors/${authorId}/follow`, {
    method: "POST",
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}

export function archiveCommunityPost(postId: string) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/archive`, {
    method: "POST",
  }).then((result) => {
    invalidateCommunityReadCaches();
    return result;
  });
}
