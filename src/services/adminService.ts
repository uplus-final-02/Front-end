// adminService.ts - 관리자 관련 API 서비스
import apiClient from "./apiClient";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  PageResponse,
} from "@/types";

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
  // 사용자 목록 조회
  getUsers: async (
    params?: AdminUserListParams,
  ): Promise<PageResponse<AdminUser>> => {
    const response = await apiClient.get("/admin/users", { params });
    return response.data;
  },

  // 사용자 상세 조회
  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const response = await apiClient.get(`/admin/users/${userId}`);
    return response.data;
  },

  // 홈 노출 태그(priority=1) 통계 조회
  getHomeTagStats: async (statDate: string): Promise<HomeTagStatItem[]> => {
    const response = await apiClient.get("/admin/stats/home-tags", {
      params: { statDate },
    });
    return response.data.data;
  },
};
