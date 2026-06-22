import type { CommunityFeedQuery } from "./communityApi";
import type { NotificationQuery } from "./timelineApi";

const normalizeText = (value?: string | null) => value?.trim().toLowerCase() || "";

const normalizeTags = (tags?: string[]) =>
  (tags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));

export const readCachePrefixes = {
  communityPosts: "community:posts:",
  communitySummary: "community:summary",
  currentUser: "user:current",
  notifications: "notifications:list:",
  recentNotifications: "notifications:recent",
  recommendations: "recommendations:places:",
  timelineDetail: "timeline:detail:",
  timelineList: "timeline:list",
  unreadNotifications: "notifications:unread",
} as const;

export const readCacheKeys = {
  communityPosts(query: CommunityFeedQuery = {}) {
    const tags = normalizeTags(query.tags).join(",");
    return [
      readCachePrefixes.communityPosts,
      query.tab || "FOR_YOU",
      normalizeText(query.query) || "-",
      tags || "-",
      String(query.page ?? 0),
      String(query.size ?? 10),
    ].join("|");
  },
  communitySummary() {
    return readCachePrefixes.communitySummary;
  },
  currentUser() {
    return readCachePrefixes.currentUser;
  },
  notifications(query: NotificationQuery = {}) {
    return [
      readCachePrefixes.notifications,
      String(query.page ?? 0),
      String(query.size ?? 20),
      query.status || "ALL",
      query.category || "ALL",
      query.includeArchived ? "ARCHIVED" : "ACTIVE",
    ].join("|");
  },
  recentNotifications() {
    return readCachePrefixes.recentNotifications;
  },
  recommendedPlaces(size = 12) {
    return `${readCachePrefixes.recommendations}${size}`;
  },
  timeline(timelineId: string) {
    return `${readCachePrefixes.timelineDetail}${timelineId}`;
  },
  timelines() {
    return readCachePrefixes.timelineList;
  },
  unreadNotifications() {
    return readCachePrefixes.unreadNotifications;
  },
};
