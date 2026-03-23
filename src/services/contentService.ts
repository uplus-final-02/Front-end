import apiClient from "./apiClient";
import { Content } from "@/types";

// 백엔드 응답 → Content 변환 헬퍼
const mapContentItem = (item: any): Content => {
  const rawType =
    item.type ??
    item.contentType ??
    item.content?.type ??
    item.content?.contentType;
  return {
    id: (item.contentId ?? item.content?.contentId)?.toString(),
    title: item.title ?? item.content?.title,
    thumbnail: item.thumbnailUrl ?? item.content?.thumbnailUrl,
    thumbnailUrl: item.thumbnailUrl ?? item.content?.thumbnailUrl,
    type: rawType === "SINGLE" ? "movie" : "series",
    isSeries: rawType === "SERIES",
    category:
      (item.tags ?? item.content?.tags)?.[0]?.name ??
      (item.tags ?? item.content?.tags)?.[0] ??
      "기타",
    tags: (item.tags ?? item.content?.tags ?? []).map((tag: any) =>
      typeof tag === "string" ? tag : tag.name,
    ),
    rating: 0,
    year: item.createdAt
      ? new Date(item.createdAt).getFullYear()
      : item.content?.createdAt
        ? new Date(item.content.createdAt).getFullYear()
        : new Date().getFullYear(),
    duration: rawType === "SINGLE" ? "미정" : "시리즈",
    description:
      item.description?.summary ??
      item.description?.description ??
      item.content?.description?.summary ??
      "",
    director:
      item.description?.director ?? item.content?.description?.director ?? "",
    actor: item.description?.actor ?? item.content?.description?.actor ?? "",
    releaseDate:
      item.description?.release ?? item.content?.description?.release ?? "",
    accessLevel: item.accessLevel ?? item.content?.accessLevel,
    isOriginal: (item.accessLevel ?? item.content?.accessLevel) === "UPLUS",
    bookmarkCount: item.bookmarkCount ?? item.content?.bookmarkCount,
    viewCount: item.totalViewCount ?? item.content?.totalViewCount,
    uploaderName: item.uploaderName ?? item.content?.uploaderName ?? "",
    uploadDate: item.createdAt ?? item.content?.createdAt,
    status: item.status ?? item.content?.status,
  };
};

export const contentService = {
  getTags: async (
    section: "LEVEL_0" | "LEVEL_1",
  ): Promise<{ tagId: number; name: string }[]> => {
    try {
      const response = await apiClient.get("/api/tags", {
        params: { section },
      });
      // 백엔드 API는 { tagId: number, name: string }[] 를 반환
      return response.data.data || [];
    } catch (error) {
      console.error(`태그 목록(${section}) 조회 실패:`, error);
      return [];
    }
  },

  // 실시간 인기 차트 조회
  getTrendingContents: async (limit: number = 10): Promise<Content[]> => {
    try {
      const response = await apiClient.get("/api/contents/home/trending", {
        params: { limit },
      });

      return response.data.data.map((item: any) => ({
        ...mapContentItem(item.content ? item : { ...item.content }),
        // trending 전용 필드
        id: item.content.contentId.toString(),
        rank: item.rank,
        trendingScore: item.trendingScore,
        // content 객체에서 직접 매핑
        title: item.content.title,
        thumbnail: item.content.thumbnailUrl,
        thumbnailUrl: item.content.thumbnailUrl,
        type: item.content.type === "SINGLE" ? "movie" : "series",
        isSeries: item.content.type === "SERIES",
        category: item.content.tags[0]?.name || "기타",
        tags: item.content.tags.map((tag: any) => tag.name),
        year: new Date(item.content.createdAt).getFullYear(),
        description:
          item.content.description?.summary ||
          item.content.description?.description ||
          "",
        director: item.content.description?.director || "",
        actor: item.content.description?.actor || "",
        releaseDate: item.content.description?.release || "",
        accessLevel: item.content.accessLevel,
        bookmarkCount: item.content.bookmarkCount,
        viewCount: item.content.totalViewCount,
        uploaderName: item.content.uploaderName || "",
      }));
    } catch (error) {
      console.error("인기 차트 조회 실패:", error);
      return [];
    }
  },

  // 추천 콘텐츠 조회
  getRecommendedContents: async (
    extended: boolean = false,
  ): Promise<{
    items: Content[];
    hasMore: boolean;
  }> => {
    try {
      const response = await apiClient.get("/api/contents/recommended", {
        params: { extended },
      });

      const items = response.data.data.items.map((item: any) =>
        mapContentItem(item),
      );

      return {
        items,
        hasMore: response.data.data.hasMore,
      };
    } catch (error) {
      console.error("추천 콘텐츠 조회 실패:", error);
      return { items: [], hasMore: false };
    }
  },

  // 기본 콘텐츠 목록 조회
  getDefaultContentList: async (params?: {
    uploaderType?: string;
    tag?: string;
    accessLevel?: string;
    contentType?: string;
    page?: number;
    size?: number;
  }): Promise<Content[]> => {
    try {
      const response = await apiClient.get("/api/contents/home/default-list", {
        params,
      });

      return response.data.data.map((item: any) => mapContentItem(item));
    } catch (error) {
      console.error("콘텐츠 목록 조회 실패:", error);
      throw error;
    }
  },

  // 시청 중인 콘텐츠 조회
  getWatchingContentList: async (): Promise<Content[]> => {
    try {
      const response = await apiClient.get("/api/contents/home/watching-list");

      return response.data.data.map((item: any) => mapContentItem(item));
    } catch (error) {
      console.error("시청 중인 콘텐츠 조회 실패:", error);
      return []; // 로그인 안 했을 수 있으니 빈 배열 반환
    }
  },

  // 찜 목록 조회
  getBookmarkList: async (): Promise<Content[]> => {
    try {
      const response = await apiClient.get("/api/contents/home/bookmark-list");

      return response.data.data.map((item: any) => mapContentItem(item));
    } catch (error) {
      console.error("찜 목록 조회 실패:", error);
      return [];
    }
  },

  // 콘텐츠 상세 조회 (ID로)
  getContentById: async (contentId: string): Promise<Content> => {
    try {
      const response = await apiClient.get(`/api/contents/${contentId}`);
      const item = response.data;

      // ContentDetailResponse의 description은 plain string(JSON)이므로 파싱
      if (
        typeof item.description === "string" &&
        item.description.startsWith("{")
      ) {
        try {
          item.description = JSON.parse(item.description);
        } catch {
          // 파싱 실패 시 원본 유지
        }
      }

      // 에피소드(비디오) 목록 조회
      // SERIES: episodes-list API로 videoId 목록 가져옴
      // SINGLE: episodes-list API가 에러를 던지므로 try-catch로 처리
      let episodes: any[] = [];
      try {
        const episodesResponse = await apiClient.get(
          `/api/contents/${contentId}/episodes-list`,
        );
        episodes = episodesResponse.data.episodes || [];
      } catch (error) {
        // SINGLE 콘텐츠이거나 에피소드가 없는 경우
      }

      return {
        ...mapContentItem(item),
        uploaderId: item.uploaderId?.toString() || "1",
        isOriginal: item.accessLevel === "UPLUS",
        videoUrl: "", // play API에서 실제 URL을 가져옴
        episodes: episodes.map((ep: any) => ({
          id: ep.videoId.toString(),
          contentId: contentId,
          episodeNumber: ep.episodeNo,
          title: ep.title,
          description: ep.description || "",
          thumbnailUrl: ep.thumbnailUrl || item.thumbnailUrl,
          videoUrl: "", // play API에서 실제 URL을 가져옴
          duration: ep.durationSec || 0,
          viewCount: ep.viewCount || 0,
        })),
      };
    } catch (error) {
      console.error("콘텐츠 조회 실패:", error);
      throw error;
    }
  },

  // 에피소드 목록 조회
  getEpisodes: async (contentId: string): Promise<any[]> => {
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
