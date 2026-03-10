import apiClient from "./apiClient";

export interface VideoPlayInfo {
  videoId: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  viewCount: number;
  durationSec: number;
  createdAt: string;
  status: string;
  tags: string[];
  uploaderType: string;
  uploaderNickname: string;
  url: string | null;
  isBookmarked: boolean;
  playbackState: {
    startPositionSec: number;
    lastUpdated: string;
  } | null;
  context: {
    isSeries: boolean;
    contentsId: number;
    episodeNumber: number;
    nextVideoId: number | null;
    prevVideoId: number | null;
  };
}

export const videoService = {
  /**
   * 영상 재생 정보 조회
   * GET /api/contents/{videoId}/play
   */
  getPlayInfo: async (videoId: number | string): Promise<VideoPlayInfo> => {
    const response = await apiClient.get(`/api/contents/${videoId}/play`);
    return response.data.data;
  },

  /**
   * 조회수 증가
   * POST /api/contents/{videoId}/views
   */
  increaseViewCount: async (videoId: number | string): Promise<void> => {
    await apiClient.post(`/api/contents/${videoId}/views`);
  },
};
