import apiClient from "./apiClient";
import type {
  BookmarkListResponse,
  BookmarkPlaylistResponse,
} from "@/types/bookmark";

export const bookmarkService = {
  /**
   * 찜 추가
   */
  addBookmark: async (contentId: number): Promise<void> => {
    await apiClient.post(`/api/histories/bookmarks/${contentId}`);
  },

  /**
   * 찜 목록 조회 (커서 페이지네이션)
   */
  getBookmarks: async (
    cursor?: string,
    size: number = 20,
  ): Promise<BookmarkListResponse> => {
    const params: { cursor?: string; size: number } = { size };
    if (cursor) {
      params.cursor = cursor;
    }

    const response = await apiClient.get("/api/users/me/bookmarks", {
      params,
    });
    return response.data.data;
  },

  /**
   * 찜 삭제
   */
  removeBookmark: async (contentId: number): Promise<void> => {
    await apiClient.delete(`/api/users/me/bookmarks/${contentId}`);
  },

  /**
   * 찜 목록 연속 재생 정보 조회
   */
  getBookmarkPlaylist: async (): Promise<BookmarkPlaylistResponse> => {
    const response = await apiClient.get("/api/users/me/bookmarks/playlist");
    return response.data.data;
  },
};
