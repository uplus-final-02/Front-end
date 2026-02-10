import { Content, WatchHistory, Bookmark, Comment } from "@/types";
import {
  mockContents,
  mockWatchHistory,
  mockBookmarks,
  mockComments,
} from "./mockData";

export const contentService = {
  // 콘텐츠 목록 조회
  getContents: async (filter?: {
    type?: "original" | "creator";
    tag?: string;
  }): Promise<Content[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    let filtered = [...mockContents];

    if (filter?.type) {
      filtered = filtered.filter((c) => c.type === filter.type);
    }

    if (filter?.tag) {
      filtered = filtered.filter((c) => c.tags.includes(filter.tag));
    }

    return filtered;
  },

  // 콘텐츠 상세 조회
  getContentById: async (id: string): Promise<Content | null> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockContents.find((c) => c.id === id) || null;
  },

  // 검색
  searchContents: async (query: string): Promise<Content[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const lowerQuery = query.toLowerCase();
    return mockContents.filter(
      (c) =>
        c.title.toLowerCase().includes(lowerQuery) ||
        c.description.toLowerCase().includes(lowerQuery) ||
        c.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
    );
  },

  // 인기 차트 (찜하기 수 기반)
  getPopularContents: async (limit: number = 10): Promise<Content[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...mockContents]
      .sort((a, b) => b.bookmarkCount - a.bookmarkCount)
      .slice(0, limit);
  },

  // 추천 콘텐츠 (태그 기반)
  getRecommendedContents: async (
    userId: string,
    preferredTags: string[],
  ): Promise<Content[]> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    return mockContents
      .filter((c) => c.tags.some((tag) => preferredTags.includes(tag)))
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, 20);
  },

  // 시청 이력 조회
  getWatchHistory: async (
    userId: string,
  ): Promise<(WatchHistory & { content: Content })[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const userHistory = mockWatchHistory
      .filter((h) => h.userId === userId)
      .sort(
        (a, b) =>
          new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime(),
      );

    return userHistory
      .map((h) => ({
        ...h,
        content: mockContents.find((c) => c.id === h.contentId)!,
      }))
      .filter((h) => h.content);
  },

  // 시청 이력 저장/업데이트
  saveWatchHistory: async (
    userId: string,
    contentId: string,
    lastPosition: number,
  ): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const existingIndex = mockWatchHistory.findIndex(
      (h) => h.userId === userId && h.contentId === contentId,
    );

    const content = mockContents.find((c) => c.id === contentId);
    const completed = content ? lastPosition >= content.duration * 0.9 : false;

    if (existingIndex !== -1) {
      mockWatchHistory[existingIndex] = {
        ...mockWatchHistory[existingIndex],
        lastPosition,
        watchedAt: new Date().toISOString(),
        completed,
      };
    } else {
      mockWatchHistory.push({
        id: `history${Date.now()}`,
        userId,
        contentId,
        lastPosition,
        watchedAt: new Date().toISOString(),
        completed,
      });
    }
  },

  // 찜하기 목록 조회
  getBookmarks: async (
    userId: string,
  ): Promise<(Bookmark & { content: Content })[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const userBookmarks = mockBookmarks.filter((b) => b.userId === userId);
    return userBookmarks
      .map((b) => ({
        ...b,
        content: mockContents.find((c) => c.id === b.contentId)!,
      }))
      .filter((b) => b.content);
  },

  // 찜하기 토글
  toggleBookmark: async (
    userId: string,
    contentId: string,
  ): Promise<boolean> => {
    await new Promise((resolve) => setTimeout(resolve, 200));

    const existingIndex = mockBookmarks.findIndex(
      (b) => b.userId === userId && b.contentId === contentId,
    );

    if (existingIndex !== -1) {
      mockBookmarks.splice(existingIndex, 1);
      // 콘텐츠의 찜하기 수 감소
      const content = mockContents.find((c) => c.id === contentId);
      if (content) content.bookmarkCount--;
      return false;
    } else {
      mockBookmarks.push({
        id: `bookmark${Date.now()}`,
        userId,
        contentId,
        createdAt: new Date().toISOString(),
      });
      // 콘텐츠의 찜하기 수 증가
      const content = mockContents.find((c) => c.id === contentId);
      if (content) content.bookmarkCount++;
      return true;
    }
  },

  // 찜하기 여부 확인
  isBookmarked: async (userId: string, contentId: string): Promise<boolean> => {
    return mockBookmarks.some(
      (b) => b.userId === userId && b.contentId === contentId,
    );
  },

  // 댓글 조회
  getComments: async (
    contentId: string,
    episodeId?: string,
  ): Promise<Comment[]> => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return mockComments
      .filter((c) => {
        if (episodeId) {
          return c.contentId === contentId && c.episodeId === episodeId;
        }
        return c.contentId === contentId && !c.episodeId;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  },

  // 댓글 작성
  addComment: async (
    contentId: string,
    userId: string,
    userName: string,
    content: string,
    episodeId?: string,
  ): Promise<Comment> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const newComment: Comment = {
      id: `comment${Date.now()}`,
      contentId,
      episodeId,
      userId,
      userName,
      content,
      createdAt: new Date().toISOString(),
    };

    mockComments.push(newComment);
    return newComment;
  },
};
