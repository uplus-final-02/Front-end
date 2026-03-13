import axios from "axios";
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

    const { policy, signature, keyPairId } = response.data.data;

    // CloudFront 자판기(/set-cookie)에 교환권을 내고 진짜 쿠키를 브라우저에 받습니다!
    // 이 요청은 CloudFront로 직접 가기 때문에, 브라우저가 CloudFront 전용 쿠키로 아주 잘 저장합니다.
    await axios.get(`https://dpfh72fut41hj.cloudfront.net/set-cookie`, {
      params: { policy, signature, keyPairId },
      withCredentials: true,
    });

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
