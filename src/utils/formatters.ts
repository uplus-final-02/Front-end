// 포맷팅 유틸리티 함수

import type {
  AuthProvider,
  UserStatus,
  PlanType,
  PaymentStatus,
  StatusBadge,
} from "@/types";

/**
 * 날짜 문자열을 한국 형식으로 포맷
 */
export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

/**
 * 날짜 + 시간 문자열을 한국 형식으로 포맷
 */
export const formatDateTime = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/**
 * 인증 제공자를 한글로 변환
 */
export const formatAuthProvider = (provider: AuthProvider | string): string => {
  const map: Record<string, string> = {
    EMAIL: "이메일",
    GOOGLE: "구글",
    KAKAO: "카카오",
    NAVER: "네이버",
  };
  return map[provider] || provider;
};

/**
 * 사용자 상태를 뱃지 정보로 변환
 */
export const formatUserStatus = (status: UserStatus | string): StatusBadge => {
  const map: Record<string, StatusBadge> = {
    ACTIVE: { label: "활성", color: "bg-green-500/20 text-green-400" },
    INACTIVE: { label: "비활성", color: "bg-gray-700 text-gray-400" },
    SUSPENDED: { label: "정지", color: "bg-red-500/20 text-red-400" },
    DELETED: { label: "탈퇴", color: "bg-red-500/20 text-red-400" },
  };
  return map[status] || { label: status, color: "bg-gray-700 text-gray-400" };
};

/**
 * 구독 플랜을 뱃지 정보로 변환
 */
export const formatPlanType = (plan: PlanType | string): StatusBadge => {
  const map: Record<string, StatusBadge> = {
    FREE: { label: "무료", color: "bg-gray-700 text-gray-400" },
    BASIC: { label: "베이직", color: "bg-blue-500/20 text-blue-400" },
    PREMIUM: { label: "프리미엄", color: "bg-primary/20 text-primary" },
  };
  return map[plan] || { label: plan, color: "bg-gray-700 text-gray-400" };
};

/**
 * 결제 상태를 뱃지 정보로 변환
 */
export const formatPaymentStatus = (
  status: PaymentStatus | string,
): StatusBadge => {
  const map: Record<string, StatusBadge> = {
    COMPLETED: { label: "완료", color: "text-green-400" },
    PENDING: { label: "대기", color: "text-yellow-400" },
    FAILED: { label: "실패", color: "text-red-400" },
    CANCELLED: { label: "취소", color: "text-gray-400" },
  };
  return map[status] || { label: status, color: "text-gray-400" };
};

/**
 * 숫자를 천 단위 구분 형식으로 변환
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  return num.toLocaleString("ko-KR");
};

/**
 * 금액을 원화 형식으로 변환
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "0원";
  return `${amount.toLocaleString("ko-KR")}원`;
};

/**
 * 초를 시:분:초 형식으로 변환
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};
