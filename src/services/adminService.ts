import axios from "axios";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  PageResponse,
} from "@/types";

// Admin API는 8082 포트 (vite 프록시로 /admin → localhost:8082)
const adminClient = axios.create({
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

export const adminService = {
  // 사용자 목록 조회
  getUsers: async (
    params?: AdminUserListParams,
  ): Promise<PageResponse<AdminUser>> => {
    const response = await adminClient.get("/admin/users", { params });
    return response.data;
  },

  // 사용자 상세 조회
  getUserDetail: async (userId: number): Promise<AdminUserDetail> => {
    const response = await adminClient.get(`/admin/users/${userId}`);
    return response.data;
  },
};
