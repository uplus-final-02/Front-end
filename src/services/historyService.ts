import apiClient from "./apiClient";

// 시청 기록 저장 요청
export interface SavePointRequest {
  positionSec: number;
  playDurationSec: number;
}

// 시청 기록 저장 응답
export interface SavePointResponse {
  historyId: number;
  status: "STARTED" | "WATCHING" | "COMPLETED";
  savedPositionSec: number;
}

// 시청 기록 항목
export interface WatchHistoryItem {
  historyId: number;
  contentId: number;
  episodeId: number | null;
  title: string;
  episodeTitle: string | null;
  episodeNumber: number | null;
  thumbnailUrl: string;
  contentType: string;
  category: string;
  lastPosition: number;
  duration: number;
  progressPercent: number;
  status: string;
  watchedAt: string;
  deletedAt: string | null;
}

// 시청 기록 목록 응답
export interface WatchHistoryListResponse {
  watchHistory: WatchHistoryItem[];
  nextCursor: string | null;
  hasNext: boolean;
}

export const historyService = {
  /** 영상 재생 위치 저장 POST /api/histories/savepoint/{videoId} */
  savePoint: async (
    videoId: number | string,
    data: SavePointRequest,
  ): Promise<SavePointResponse> => {
    const response = await apiClient.post(
      `/api/histories/savepoint/${videoId}`,
      data,
    );
    return response.data.data;
  },

  /** 시청 기록 조회 GET /api/users/me/watch-history */
  getWatchHistory: async (
    cursor?: number,
    size: number = 20,
  ): Promise<WatchHistoryListResponse> => {
    const params: any = { size };
    if (cursor) params.cursor = cursor;
    const response = await apiClient.get("/api/users/me/watch-history", {
      params,
    });
    return response.data.data;
  },

  /** 시청 기록 삭제 DELETE /api/users/me/watch-history/{historyId} */
  deleteWatchHistory: async (historyId: number): Promise<void> => {
    await apiClient.delete(`/api/users/me/watch-history/${historyId}`);
  },
};
