// 백오피스 관련 타입

import { AuthProvider } from "./auth";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
export type PlanType = "FREE" | "BASIC" | "PREMIUM";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentStatus = "COMPLETED" | "PENDING" | "FAILED" | "CANCELLED";

export interface AdminUser {
  userId: number;
  name: string;
  createdAt: string;
  loginMethods: {
    authProvider: AuthProvider;
    identifier: string;
  }[];
}

export interface AdminUserDetail {
  user: {
    userId: number;
    nickname: string;
    userStatus: UserStatus;
    createdAt: string;
    updatedAt: string;
    deletedAt: string | null;
  };
  subscription: {
    subscriptionId: number;
    planType: PlanType;
    subscriptionStatus: SubscriptionStatus;
    startedAt: string;
    expiresAt: string;
  } | null;
  paymentHistory: {
    paymentId: number;
    amount: number;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    requestAt: string;
    approvedAt: string | null;
  }[];
}

export interface AdminUserListParams {
  search?: string;
  page?: number;
  size?: number;
}

export interface StatusBadge {
  label: string;
  color: string;
}

export const USER_STATUS_MAP: Record<UserStatus, StatusBadge> = {
  ACTIVE: { label: "활성", color: "bg-green-500/20 text-green-400" },
  INACTIVE: { label: "비활성", color: "bg-gray-700 text-gray-400" },
  SUSPENDED: { label: "정지", color: "bg-red-500/20 text-red-400" },
  DELETED: { label: "탈퇴", color: "bg-red-500/20 text-red-400" },
};

export const PLAN_TYPE_MAP: Record<PlanType, StatusBadge> = {
  FREE: { label: "무료", color: "bg-gray-700 text-gray-400" },
  BASIC: { label: "베이직", color: "bg-blue-500/20 text-blue-400" },
  PREMIUM: { label: "프리미엄", color: "bg-primary/20 text-primary" },
};

export const PAYMENT_STATUS_MAP: Record<PaymentStatus, StatusBadge> = {
  COMPLETED: { label: "완료", color: "text-green-400" },
  PENDING: { label: "대기", color: "text-yellow-400" },
  FAILED: { label: "실패", color: "text-red-400" },
  CANCELLED: { label: "취소", color: "text-gray-400" },
};
