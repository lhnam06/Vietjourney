import { getAuthToken } from "./authApi";
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
  tag?: string;
  page?: number;
  size?: number;
}

function authHeaders(body?: boolean) {
  const token = getAuthToken();
  return {
    ...(body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init: RequestInit = {}, signal?: AbortSignal) {
  const response = await fetch(path, {
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
  const params = new URLSearchParams();
  params.set("tab", query.tab || "FOR_YOU");
  params.set("page", String(query.page ?? 0));
  params.set("size", String(query.size ?? 10));
  if (query.query?.trim()) params.set("query", query.query.trim());
  if (query.tag?.trim()) params.set("tag", query.tag.trim());

  return apiFetch<SpringPage<CommunityPost>>(`/api/v1/community/posts?${params.toString()}`, {}, signal);
}

export function fetchCommunitySummary(signal?: AbortSignal) {
  return apiFetch<CommunitySummary>("/api/v1/community/summary", {}, signal);
}

export function createCommunityPost(input: CommunityPostInput) {
  return apiFetch<CommunityPost>("/api/v1/community/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function toggleCommunityLike(postId: string) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/like`, {
    method: "POST",
  });
}

export function toggleCommunitySave(postId: string) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/save`, {
    method: "POST",
  });
}

export function rateCommunityPost(postId: string, rating: number) {
  return apiFetch<CommunityPost>(`/api/v1/community/posts/${postId}/rating`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
}

export function fetchCommunityComments(postId: string, signal?: AbortSignal) {
  return apiFetch<CommunityComment[]>(`/api/v1/community/posts/${postId}/comments`, {}, signal);
}

export function createCommunityComment(postId: string, content: string) {
  return apiFetch<CommunityComment>(`/api/v1/community/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function copyCommunityTimeline(postId: string) {
  return apiFetch<Timeline>(`/api/v1/community/posts/${postId}/copy`, {
    method: "POST",
  });
}

export function toggleCommunityFollow(authorId: string) {
  return apiFetch<CommunityAuthor>(`/api/v1/community/authors/${authorId}/follow`, {
    method: "POST",
  });
}
