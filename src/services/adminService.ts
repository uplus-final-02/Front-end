import apiClient from "./apiClient";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  PageResponse,
} from "@/types";

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
};
