import apiClient from "./apiClient";
import { Content } from "@/types";

// 개발 모드: Mock 사용 여부
const USE_MOCK = false; // 콘텐츠 API는 실제 API 사용

// Mock 데이터
const mockContents: Content[] = [
  {
    id: "1",
    title: "액션 영화 1",
    thumbnail: "https://picsum.photos/seed/movie1/400/225",
    type: "movie",
    category: "액션",
    tags: ["액션", "스릴러"],
    rating: 4.5,
    year: 2024,
    duration: "2시간 15분",
  },
  // ... 더 많은 Mock 데이터
];

export const contentService = {
  // 기본 콘텐츠 목록 조회
  getDefaultContentList: async (params?: {
    uploaderType?: string;
    tag?: string;
  }): Promise<Content[]> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockContents;
    }

    try {
      const response = await apiClient.get("/api/contents/home/default-list", {
        params,
      });

      // 백엔드 응답을 프론트엔드 Content 타입으로 변환
      return response.data.data.map((item: any) => ({
        id: item.contentId.toString(),
        title: item.title,
        thumbnail: item.thumbnailUrl,
        type: item.type === "SINGLE" ? "movie" : "series",
        category: item.tags[0]?.name || "기타",
        tags: item.tags.map((tag: any) => tag.name),
        rating: 0, // API에 없음
        year: new Date(item.createdAt).getFullYear(),
        duration: item.type === "SINGLE" ? "미정" : `시리즈`,
        description:
          item.description?.summary || item.description?.description || "",
        accessLevel: item.accessLevel,
        bookmarkCount: item.bookmarkCount,
        viewCount: item.totalViewCount,
      }));
    } catch (error) {
      console.error("콘텐츠 목록 조회 실패:", error);
      throw error;
    }
  },

  // 시청 중인 콘텐츠 조회
  getWatchingContentList: async (): Promise<Content[]> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockContents.slice(0, 3);
    }

    try {
      const response = await apiClient.get("/api/contents/home/watching-list");

      return response.data.data.map((item: any) => ({
        id: item.contentId.toString(),
        title: item.title,
        thumbnail: item.thumbnailUrl,
        type: item.type === "SINGLE" ? "movie" : "series",
        category: item.tags[0]?.name || "기타",
        tags: item.tags.map((tag: any) => tag.name),
        rating: 0,
        year: new Date(item.createdAt).getFullYear(),
        duration: item.type === "SINGLE" ? "미정" : `시리즈`,
        description:
          item.description?.summary || item.description?.description || "",
        accessLevel: item.accessLevel,
        bookmarkCount: item.bookmarkCount,
        viewCount: item.totalViewCount,
      }));
    } catch (error) {
      console.error("시청 중인 콘텐츠 조회 실패:", error);
      return []; // 로그인 안 했을 수 있으니 빈 배열 반환
    }
  },

  // 찜 목록 조회
  getBookmarkList: async (): Promise<Content[]> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockContents.slice(0, 5);
    }

    try {
      const response = await apiClient.get("/api/contents/home/bookmark-list");

      return response.data.data.map((item: any) => ({
        id: item.contentId.toString(),
        title: item.title,
        thumbnail: item.thumbnailUrl,
        type: item.type === "SINGLE" ? "movie" : "series",
        category: item.tags[0]?.name || "기타",
        tags: item.tags.map((tag: any) => tag.name),
        rating: 0,
        year: new Date(item.createdAt).getFullYear(),
        duration: item.type === "SINGLE" ? "미정" : `시리즈`,
        description:
          item.description?.summary || item.description?.description || "",
        accessLevel: item.accessLevel,
        bookmarkCount: item.bookmarkCount,
        viewCount: item.totalViewCount,
      }));
    } catch (error) {
      console.error("찜 목록 조회 실패:", error);
      return [];
    }
  },

  // 콘텐츠 상세 조회 (ID로)
  getContentById: async (contentId: string): Promise<Content> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      const found = mockContents.find((c) => c.id === contentId);
      if (!found) throw new Error("콘텐츠를 찾을 수 없습니다");
      return found;
    }

    try {
      const response = await apiClient.get(`/api/contents/${contentId}`);
      const item = response.data;

      // 에피소드 목록 조회 (시리즈인 경우만)
      let episodes: any[] = [];
      if (item.type === "SERIES") {
        try {
          const episodesResponse = await apiClient.get(
            `/api/contents/${contentId}/episodes-list`,
          );
          episodes = episodesResponse.data.episodes || [];
        } catch (error) {
          console.error("에피소드 조회 실패:", error);
        }
      }

      return {
        id: item.contentId.toString(),
        title: item.title,
        thumbnail: item.thumbnailUrl,
        thumbnailUrl: item.thumbnailUrl,
        type: item.type === "SINGLE" ? "movie" : "series",
        category: item.tags[0]?.name || "기타",
        tags: item.tags.map((tag: any) => tag.name),
        rating: 0,
        year: new Date(item.createdAt).getFullYear(),
        duration: item.type === "SINGLE" ? "미정" : `시리즈`,
        description:
          item.description?.summary || item.description?.description || "",
        accessLevel: item.accessLevel,
        bookmarkCount: item.bookmarkCount,
        viewCount: item.totalViewCount,
        uploadDate: item.createdAt,
        uploaderName: "sample_uploader",
        uploaderId: item.uploaderId?.toString() || "1",
        status: item.status,
        isOriginal: item.accessLevel === "UPLUS",
        isSeries: item.type === "SERIES",
        videoUrl:
          item.type === "SINGLE"
            ? "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
            : "", // 샘플 HLS URL
        episodes: episodes.map((ep: any) => ({
          id: ep.videoId.toString(),
          contentId: contentId,
          episodeNumber: ep.episodeNo,
          title: ep.title,
          description: ep.description || "",
          thumbnailUrl: ep.thumbnailUrl || item.thumbnailUrl,
          videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8", // 샘플 HLS URL
          duration: ep.durationSec || 0,
          viewCount: ep.viewCount || 0,
        })),
      };
    } catch (error) {
      console.error("콘텐츠 조회 실패:", error);
      throw error;
    }
  },

  // 콘텐츠 상세 조회
  getContentDetail: async (contentId: string): Promise<any> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return mockContents.find((c) => c.id === contentId);
    }

    try {
      const response = await apiClient.get(`/api/contents/${contentId}`);
      return response.data;
    } catch (error) {
      console.error("콘텐츠 상세 조회 실패:", error);
      throw error;
    }
  },

  // 에피소드 목록 조회
  getEpisodes: async (contentId: string): Promise<any[]> => {
    if (USE_MOCK) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return [];
    }

    try {
      const response = await apiClient.get(
        `/api/contents/${contentId}/episodes-list`,
      );
      return response.data.episodes || [];
    } catch (error) {
      console.error("에피소드 조회 실패:", error);
      return [];
    }
  },

  // 찜하기 여부 확인 (로컬 스토리지 기반 임시 구현)
  isBookmarked: async (userId: string, contentId: string): Promise<boolean> => {
    const bookmarks = JSON.parse(localStorage.getItem("ott_bookmarks") || "[]");
    return bookmarks.some(
      (b: any) => b.userId === userId && b.contentId === contentId,
    );
  },

  // 찜하기 토글
  toggleBookmark: async (
    userId: string,
    contentId: string,
  ): Promise<boolean> => {
    const bookmarks = JSON.parse(localStorage.getItem("ott_bookmarks") || "[]");
    const index = bookmarks.findIndex(
      (b: any) => b.userId === userId && b.contentId === contentId,
    );
    if (index >= 0) {
      bookmarks.splice(index, 1);
      localStorage.setItem("ott_bookmarks", JSON.stringify(bookmarks));
      return false;
    } else {
      bookmarks.push({
        userId,
        contentId,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("ott_bookmarks", JSON.stringify(bookmarks));
      return true;
    }
  },

  // 댓글 조회
  getComments: async (
    contentId: string,
    episodeId?: string,
  ): Promise<any[]> => {
    const comments = JSON.parse(localStorage.getItem("ott_comments") || "[]");
    return comments.filter(
      (c: any) =>
        c.contentId === contentId &&
        (episodeId ? c.episodeId === episodeId : true),
    );
  },

  // 댓글 작성
  addComment: async (
    contentId: string,
    userId: string,
    userName: string,
    content: string,
    episodeId?: string,
  ): Promise<any> => {
    const comments = JSON.parse(localStorage.getItem("ott_comments") || "[]");
    const newComment = {
      id: `comment-${Date.now()}`,
      contentId,
      episodeId,
      userId,
      userName,
      content,
      createdAt: new Date().toISOString(),
    };
    comments.unshift(newComment);
    localStorage.setItem("ott_comments", JSON.stringify(comments));
    return newComment;
  },

  // 시청 이력 조회
  getWatchHistory: async (userId: string): Promise<any[]> => {
    const history = JSON.parse(
      localStorage.getItem("ott_watch_history") || "[]",
    );
    return history.filter((h: any) => h.userId === userId);
  },

  // 시청 이력 저장
  saveWatchHistory: async (
    userId: string,
    contentId: string,
    currentTime: number,
  ): Promise<void> => {
    const history = JSON.parse(
      localStorage.getItem("ott_watch_history") || "[]",
    );
    const index = history.findIndex(
      (h: any) => h.userId === userId && h.contentId === contentId,
    );
    const entry = {
      id: `history-${Date.now()}`,
      userId,
      contentId,
      lastPosition: currentTime,
      watchedAt: new Date().toISOString(),
      completed: false,
    };
    if (index >= 0) {
      history[index] = { ...history[index], ...entry };
    } else {
      history.push(entry);
    }
    localStorage.setItem("ott_watch_history", JSON.stringify(history));
  },
};
