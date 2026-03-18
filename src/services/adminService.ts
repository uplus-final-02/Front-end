// adminService.ts - 관리자 관련 API 서비스
import apiClient from "./apiClient";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  PageResponse,
  AdminMetricsDashboard,
  AdminSnapshotBucketListParams,
  AdminSnapshotBucketPageResponse,
  AdminTrendingTimelineParams,
  AdminTrendingTimelineResponse,
  AdminTrendingDetailParams,
  AdminTrendingDetailResponse,
  AdminTrendingVerifyParams,
  AdminTrendingVerifyResponse,
} from "@/types";

// 관리자 콘텐츠 관련 타입
export interface AdminContent {
  contentId: number;
  title: string;
  type: "SINGLE" | "SERIES";
  uploaderId: number;
  status: string;
}

export interface AdminContentDetail {
  contentId: number;
  type: "SINGLE" | "SERIES";
  title: string;
  description: string;
  thumbnailUrl: string;
  status: string;
  accessLevel: string;
  uploaderId: number;
  createdAt: string;
  updatedAt: string;
  tags: { tagId: number; name: string }[];
  episodes: {
    videoId: number;
    episodeNo: number;
    title: string;
    description: string;
  }[];
}

export interface AdminContentUpdateRequest {
  title?: string;
  description?: string;
  thumbnailUrl?: string;
  tagIds?: number[];
  accessLevel?: string;
  status?: string;
}

export interface HomeTagStatItem {
  statDate: string;
  tagId: number;
  tagName: string;
  totalViewCount: number;
  totalBookmarkCount: number;
  bookmarkRate: number;
  totalWatchCount: number;
  completedWatchCount: number;
  completionRate: number;
}

export const adminService = {
  // ══════════════════════════════════════════════════════════════
  //  태그 조회
  // ══════════════════════════════════════════════════════════════
  getTags: async (
    section: "LEVEL_0" | "LEVEL_1" | "LEVEL_2" = "LEVEL_2",
  ): Promise<{ tagId: number; name: string; priority: number }[]> => {
    const response = await apiClient.get("/admin/tags", {
      params: { section },
    });
    return response.data.data;
  },

  // ══════════════════════════════════════════════════════════════
  //  사용자 관리
  // ══════════════════════════════════════════════════════════════
  getUsers: async (
    params?: AdminUserListParams,
  ): Promise<PageResponse<AdminUser>> => {
    const response = await apiClient.get("/admin/users", { params });
    return response.data;
  },

  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  // ══════════════════════════════════════════════════════════════
  //  콘텐츠 관리
  // ══════════════════════════════════════════════════════════════
  getContents: async (params?: {
    page?: number;
    size?: number;
    sort?: string;
    status?: string;
  }): Promise<{
    content: AdminContent[];
    totalPages: number;
    totalElements: number;
    number: number;
  }> => {
    const response = await apiClient.get("/admin/contents/list", { params });
    const data = response.data.data;
    return data;
  },

  getContentDetail: async (contentId: number): Promise<AdminContentDetail> => {
    const response = await apiClient.get(`/admin/contents/${contentId}`);
    return response.data.data;
  },

  updateContentMetadata: async (
    contentId: number,
    request: AdminContentUpdateRequest,
  ) => {
    // 빈 문자열 enum 값 방지 (Spring에서 HttpMessageNotReadableException 발생)
    const cleanedRequest = { ...request };
    if (
      cleanedRequest.accessLevel !== undefined &&
      cleanedRequest.accessLevel === ""
    ) {
      delete cleanedRequest.accessLevel;
    }
    if (cleanedRequest.status !== undefined && cleanedRequest.status === "") {
      delete cleanedRequest.status;
    }
    const response = await apiClient.put(
      `/admin/contents/${contentId}/metadata`,
      JSON.stringify(cleanedRequest),
      { headers: { "Content-Type": "application/json" } },
    );
    return response.data;
  },

  deleteContent: async (contentId: number) => {
    const response = await apiClient.delete(`/admin/contents/${contentId}`);
    return response.data;
  },

  uploadThumbnail: async (contentId: number, file: File, videoId?: number) => {
    const formData = new FormData();
    formData.append("file", file);
    const params: Record<string, any> = {};
    if (videoId) params.videoId = videoId;
    const response = await apiClient.post(
      `/admin/contents/${contentId}/thumbnail`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        params,
      },
    );
    return response.data.data;
  },

  // ══════════════════════════════════════════════════════════════
  //  영상 업로드 (단일 콘텐츠)
  // ══════════════════════════════════════════════════════════════
  createVideoDraft: async (): Promise<{
    contentId: number;
    videoId: number;
    videoFileId: number;
  }> => {
    const response = await apiClient.post("/admin/videos/draft");
    return response.data;
  },

  getVideoPresignedUrl: async (
    contentId: number,
    originalFilename: string,
    contentType: string,
  ) => {
    const response = await apiClient.post("/admin/uploads/videos/presign", {
      contentId,
      originalFilename,
      contentType,
    });
    return response.data as {
      contentId: number;
      objectKey: string;
      putUrl: string;
      expiresAt: string;
    };
  },

  confirmVideoUpload: async (
    contentId: number,
    videoId: number,
    objectKey: string,
  ) => {
    const response = await apiClient.post("/admin/videos/confirm", {
      contentId,
      videoId,
      objectKey,
    });
    return response.data;
  },

  // ══════════════════════════════════════════════════════════════
  //  시리즈 초안 생성
  // ══════════════════════════════════════════════════════════════
  createSeriesDraft: async (): Promise<{ contentId: number }> => {
    const response = await apiClient.post("/admin/series/draft");
    return response.data;
  },

  // ══════════════════════════════════════════════════════════════
  //  시리즈 에피소드 업로드
  // ══════════════════════════════════════════════════════════════
  createEpisodeDraft: async (seriesId: number) => {
    const response = await apiClient.post(
      `/admin/series/${seriesId}/episodes/draft`,
    );
    return response.data as {
      contentId: number;
      videoId: number;
      videoFileId: number;
      episodeNo: number;
    };
  },

  getEpisodePresignedUrl: async (
    seriesId: number,
    videoId: number,
    originalFilename: string,
    contentType: string,
  ) => {
    const response = await apiClient.post(
      `/admin/series/${seriesId}/episodes/${videoId}/presign`,
      {
        originalFilename,
        contentType,
      },
    );
    return response.data as {
      contentId: number;
      videoId: number;
      objectKey: string;
      putUrl: string;
      expiresAt: string;
    };
  },

  confirmEpisodeUpload: async (
    seriesId: number,
    videoId: number,
    objectKey: string,
  ) => {
    const response = await apiClient.post(
      `/admin/series/${seriesId}/episodes/confirm`,
      {
        videoId,
        objectKey,
      },
    );
    return response.data;
  },

  // 홈 노출 태그(priority=1) 통계 조회
  getHomeTagStats: async (statDate: string): Promise<HomeTagStatItem[]> => {
    const response = await apiClient.get("/admin/stats/home-tags", {
      params: { statDate },
    });
    return response.data.data;
  },

  // =========================
  // 인기차트(Trending) 운영
  // Base Path: /admin/metrics
  // =========================
  async getMetricsDashboard(): Promise<AdminMetricsDashboard> {
    const { data } = await apiClient.get("/admin/metrics/dashboard");
    return data;
  },

  async getSnapshotBuckets(
    params: AdminSnapshotBucketListParams,
  ): Promise<AdminSnapshotBucketPageResponse> {
    const { data } = await apiClient.get("/admin/metrics/snapshots/buckets", {
      params,
    });
    return data;
  },

  async getTrendingTimeline(
    params: AdminTrendingTimelineParams,
  ): Promise<AdminTrendingTimelineResponse> {
    const { data } = await apiClient.get("/admin/metrics/trending/timeline", {
      params,
    });
    return data;
  },

  async getTrendingDetail(
    params: AdminTrendingDetailParams,
  ): Promise<AdminTrendingDetailResponse> {
    const { data } = await apiClient.get("/admin/metrics/trending/detail", {
      params,
    });
    return data;
  },

  async getTrendingVerify(
    params: AdminTrendingVerifyParams,
  ): Promise<AdminTrendingVerifyResponse> {
    const { data } = await apiClient.get("/admin/metrics/trending/verify", {
      params,
    });
    return data;
  },
};
