import apiClient from "./apiClient";
import type { Content } from "@/types";

export interface SearchParams {
  keyword?: string;
  category?: string;
  genre?: string;
  tag?: string;
  sort?: "RELATED" | "LATEST" | "POPULAR";
  page?: number;
  size?: number;
}

export interface SearchResult {
  contents: Content[];
  hasNext: boolean;
  message: string;
}

// 백엔드 검색 아이템 → Content 변환
const mapSearchItem = (item: any): Content => {
  const rawType = item.type ?? item.contentType;
  return {
    id: item.contentId?.toString(),
    title: item.title,
    highlightTitle: item.highlightTitle || null,
    highlightDescription: item.highlightDescription || null,
    thumbnailUrl: item.thumbnailUrl,
    thumbnail: item.thumbnailUrl,
    tags: item.tags || [],
    matchType: item.matchType,
    type:
      rawType === "SINGLE"
        ? "movie"
        : rawType === "SERIES"
          ? "series"
          : undefined,
    isSeries: rawType === "SERIES",
    rating: 0,
    year: new Date().getFullYear(),
    duration: 0,
    description: item.highlightDescription || "",
    accessLevel: item.accessLevel || "FREE",
    viewCount: item.totalViewCount ?? 0,
  };
};

export const searchService = {
  /** 메인 검색 (OTT 콘텐츠) */
  search: async (params: SearchParams): Promise<SearchResult> => {
    const response = await apiClient.get("/api/search", { params });
    const data = response.data;
    return {
      contents: data.data.contents.map(mapSearchItem),
      hasNext: data.data.hasNext,
      message: data.message,
    };
  },

  /** 크리에이터 영상 검색 */
  searchCreator: async (
    keyword: string,
    page = 0,
    size = 15,
  ): Promise<{ contents: Content[]; hasNext: boolean }> => {
    if (!keyword.trim()) return { contents: [], hasNext: false };
    const response = await apiClient.get("/api/search/creator/search", {
      params: { keyword, page, size },
    });
    const items: any[] = response.data.data || [];
    return {
      contents: items.map((item) => ({
        id: item.userContentId?.toString(),
        title: item.title,
        thumbnail: item.thumbnailUrl,
        thumbnailUrl: item.thumbnailUrl,
        tags: item.tags || [],
        type: "creator" as const,
        isSeries: false,
        rating: 0,
        year: new Date().getFullYear(),
        duration: 0,
        accessLevel: item.accessLevel || "FREE",
        viewCount: item.totalViewCount ?? 0,
        bookmarkCount: item.bookmarkCount ?? 0,
        isCreatorContent: true,
      })),
      hasNext: items.length >= size,
    };
  },

  /** 자동완성 */
  getSuggestions: async (keyword: string): Promise<string[]> => {
    if (!keyword.trim()) return [];
    const response = await apiClient.get("/api/search/suggestions", {
      params: { keyword },
    });
    return response.data.data || [];
  },
};
