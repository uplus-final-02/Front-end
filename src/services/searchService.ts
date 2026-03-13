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
const mapSearchItem = (item: any): Content => ({
  id: item.contentId?.toString(),
  title: item.highlightTitle?.replace(/<\/?em>/g, "") || item.title,
  highlightTitle: item.highlightTitle || null,
  highlightDescription: item.highlightDescription || null,
  thumbnailUrl: item.thumbnailUrl,
  thumbnail: item.thumbnailUrl,
  tags: item.tags || [],
  matchType: item.matchType,
  rating: 0,
  year: new Date().getFullYear(),
  duration: 0,
  description: item.highlightDescription || "",
  accessLevel: "FREE",
  viewCount: 0,
});

export const searchService = {
  /** 메인 검색 */
  search: async (params: SearchParams): Promise<SearchResult> => {
    const response = await apiClient.get("/api/search", { params });
    const data = response.data;
    return {
      contents: data.data.contents.map(mapSearchItem),
      hasNext: data.data.hasNext,
      message: data.message,
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
