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
};
