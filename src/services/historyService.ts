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

// 사용자 콘텐츠 시청 기록 아이템
export interface UserContentWatchHistoryItem {
  historyId: number;
  userContentId: number;
  parentContentId: number;
  title: string;
  description: string | null;
  thumbnailUrl: string;
  contentStatus: "HIDDEN" | "VISIBLE" | "DELETED";
  lastWatchedAt: string;
  deletedAt: string | null;
}

// 사용자 콘텐츠 시청 기록 그룹
export interface UserContentWatchHistoryGroup {
  parentContentId: number;
  parentThumbnailUrl: string;
  parentTitle: string;
  watchHistories: UserContentWatchHistoryItem[];
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

  /** 홈화면 시청 기록 조회 GET /api/contents/home/watching-list */
  getHomeWatchHistory: async (): Promise<WatchHistoryListResponse> => {
    const response = await apiClient.get("/api/contents/home/watching-list"
    );
    return response.data.data;
  },

  /** 시청 기록 삭제 DELETE /api/users/me/watch-history/{historyId} */
  deleteWatchHistory: async (historyId: number): Promise<void> => {
    await apiClient.delete(`/api/users/me/watch-history/${historyId}`);
  },

  /** 사용자 제작 콘텐츠 시청 기록 조회 GET /api/users/me/watch-history/user-content */
  getUserContentWatchHistory: async (): Promise<UserContentWatchHistoryGroup[]> => {
    const response = await apiClient.get(
      "/api/users/me/watch-history/user-content",
    );
    return response.data.data;
  },
};

// 장르별 통계
export interface GenreStatistics {
  tagId: number;
  tagName: string;
  watchedCount: number;
  watchTime: number;
  percentage: number;
}

// 시청 통계 응답
export interface WatchStatistics {
  totalWatchedCount: number;
  totalWatchTime: number;
  statisticsByGenre: GenreStatistics[];
  updatedAt: string;
}

export const statsService = {
  /** 시청 통계 조회 GET /api/users/me/watch-history/statistics */
  getWatchStatistics: async (): Promise<WatchStatistics> => {
    const response = await apiClient.get(
      "/api/users/me/watch-history/statistics",
    );
    return response.data.data;
  },
};
