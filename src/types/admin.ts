// 백오피스 관련 타입

import { AuthProvider } from "./auth";

export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "DELETED";
export type PlanType = "FREE" | "BASIC" | "PREMIUM";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";
export type PaymentStatus = "SUCCEEDED" | "FAILED";
export type AdminJobStatus = "SUCCESS" | "EMPTY" | "FAILED";

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
  SUCCEEDED: { label: "완료", color: "text-green-400" },
  FAILED: { label: "실패", color: "text-red-400" },
};

// =========================
// 관리자 인기차트(Trending) 운영 타입
// =========================

export const ADMIN_JOB_STATUS_MAP: Record<AdminJobStatus, StatusBadge> = {
  SUCCESS: { label: "성공", color: "bg-green-500/20 text-green-400" },
  EMPTY: { label: "변화 없음", color: "bg-gray-700 text-gray-400" },
  FAILED: { label: "실패", color: "bg-red-500/20 text-red-400" },
};

export interface AdminMetricsDashboardBucketSummary {
  bucketStartAt: string;
  rowsCount: number;
  viewDeltaSum: number;
  bookmarkDeltaSum: number;
  completedDeltaSum: number;
  jobStatus: AdminJobStatus;
  message: string | null;
}

export interface AdminMetricsDashboardTrendingSummary {
  calculatedAt: string;
  jobStatus: AdminJobStatus;
  message: string | null;
  trendingHistoryCount: number;
}

export interface AdminMetricsDashboardVerifySummary {
  calculatedAt: string;
  matchedCount: number;
  mismatchedCount: number;
}

export interface AdminMetricsDashboard {
  bucketSummaries: AdminMetricsDashboardBucketSummary[];
  trendingSummaries: AdminMetricsDashboardTrendingSummary[];
  verifySummaries: AdminMetricsDashboardVerifySummary[];
}

export interface AdminSnapshotBucketItem {
  bucketStartAt: string;
  rowsCount: number;
  viewDeltaSum: number;
  bookmarkDeltaSum: number;
  completedDeltaSum: number;
  jobStatus: AdminJobStatus;
  message: string | null;
}

export interface AdminSnapshotBucketListParams {
  from: string;
  to: string;
  page?: number;
  size?: number;
}

export interface AdminPageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export type AdminSnapshotBucketPageResponse =
  AdminPageResponse<AdminSnapshotBucketItem>;

export interface AdminTrendingTimelineItem {
  calculatedAt: string;
  jobStatus: AdminJobStatus;
  message: string | null;
  trendingHistoryCount: number;
}

export interface AdminTrendingTimelineParams {
  date: string; // YYYY-MM-DD
  limit?: number;
}

export interface AdminTrendingTimelineResponse {
  items: AdminTrendingTimelineItem[];
}

export interface AdminTrendingDetailItem {
  rank: number;
  contentId: number;
  title: string;
  type: string;
  score: number;
  viewDelta: number;
  bookmarkDelta: number;
  completedDelta: number;
  uploaderId: number | null;
  uploaderName: string | null;
}

export interface AdminTrendingDetailParams {
  calculatedAt: string; // YYYY-MM-DDTHH:00:00
  limit?: number;
}

export interface AdminTrendingDetailResponse {
  calculatedAt: string;
  items: AdminTrendingDetailItem[];
}

export interface AdminTrendingVerifyItem {
  contentId: number;
  title: string;
  snapshotViewDelta: number;
  trendingViewDelta: number;
  snapshotBookmarkDelta: number;
  trendingBookmarkDelta: number;
  snapshotCompletedDelta: number;
  trendingCompletedDelta: number;
  matched: boolean;
}

export interface AdminTrendingVerifyParams {
  calculatedAt: string; // YYYY-MM-DDTHH:00:00
}

export interface AdminTrendingVerifyResponse {
  calculatedAt: string;
  matchedCount: number;
  mismatchedCount: number;
  items: AdminTrendingVerifyItem[];
}