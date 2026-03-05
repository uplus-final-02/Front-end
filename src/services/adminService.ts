import axios from "axios";
import type {
  AdminUser,
  AdminUserDetail,
  AdminUserListParams,
  PageResponse,
} from "@/types";

// Admin API Base URL
const ADMIN_API_BASE_URL = import.meta.env.VITE_ADMIN_API_BASE_URL as string;

// Admin API는 8882 포트 (vite 프록시로 /admin → localhost:8882)
const adminClient = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true", // ngrok 브라우저 경고 건너뛰기
  },
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
