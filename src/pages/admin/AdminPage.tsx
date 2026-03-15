// AdminPage.tsx - 관리자 페이지 컴포넌트
import React, { useState, useEffect, useCallback } from "react";
import {
  Users,
  Video,
  BarChart3,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

import { adminService } from "@/services/adminService";
import Statistics from "./Statistics";
import type { AdminUser, AdminUserDetail } from "@/types";
import {
  formatDate,
  formatAuthProvider,
  formatUserStatus,
  formatPlanType,
  formatPaymentStatus,
  formatCurrency,
} from "@/utils/formatters";
import { ADMIN_CONSTANTS } from "@/constants";
import ContentsManagement from "./ContentsManagement";

type TabType = "users" | "contents" | "stats";

const AdminPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchKeyword, setSearchKeyword] = useState("");

  // 로그인 안 됐거나 ADMIN이 아니면 접근 차단
  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h2>
          <p className="text-gray-400 mb-6">
            관리자 계정으로 로그인해야 접근할 수 있습니다.
          </p>
          <button onClick={() => navigate("/login")} className="btn-primary">
            로그인 페이지로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">백오피스</h1>
          <p className="text-gray-400">관리자 전용 페이지</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "users"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5" />
            사용자 관리
          </button>
          <button
            onClick={() => setActiveTab("contents")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "contents"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Video className="w-5 h-5" />
            콘텐츠 관리
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "stats"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            통계/분석
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === "users" && (
          <UsersManagement
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
          />
        )}
        {activeTab === "contents" && (
          <ContentsManagement
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
          />
        )}
        {activeTab === "stats" && <Statistics />}
      </div>
    </div>
  );
};

// 사용자 관리 컴포넌트
const UsersManagement: React.FC<{
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
}> = ({ searchKeyword, setSearchKeyword }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(
    null,
  );
  const [detailLoading, setDetailLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUsers({
        search: searchKeyword || undefined,
        page,
        size: ADMIN_CONSTANTS.USERS_PER_PAGE,
      });
      setUsers(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error("사용자 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [page, searchKeyword]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 검색 시 페이지 리셋
  useEffect(() => {
    setPage(0);
  }, [searchKeyword]);

  const handleViewDetail = async (userId: number) => {
    setDetailLoading(true);
    try {
      const detail = await adminService.getUserDetail(userId);
      setSelectedUser(detail);
    } catch (error) {
      console.error("사용자 상세 조회 실패:", error);
      alert("사용자 상세 정보를 불러올 수 없습니다.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div>
      {/* 검색 */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative max-w-md flex-1">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="이름으로 검색..."
            className="w-full bg-gray-800 border border-gray-700 rounded pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <span className="text-sm text-gray-400">총 {totalElements}명</span>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  로그인 방식
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  가입일
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm">{user.userId}</td>
                    <td className="px-6 py-4 text-sm">{user.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-1 flex-wrap">
                        {user.loginMethods.map((m, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-gray-800 rounded text-xs"
                          >
                            {formatAuthProvider(m.authProvider)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleViewDetail(user.userId)}
                        className="text-primary hover:underline"
                      >
                        상세보기
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
            const pageNum = startPage + i;
            if (pageNum >= totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-4 py-2 rounded transition-colors ${
                  page === pageNum
                    ? "bg-primary"
                    : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {pageNum + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 사용자 상세 모달 */}
      {(selectedUser || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/70"
            onClick={() => setSelectedUser(null)}
          />
          <div className="relative bg-gray-900 rounded-lg p-8 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-800 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {detailLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : selectedUser ? (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">사용자 상세 정보</h2>

                {/* 기본 정보 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">기본 정보</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">ID</span>
                      <p>{selectedUser.user.userId}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">닉네임</span>
                      <p>{selectedUser.user.nickname}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">상태</span>
                      <p>
                        <span
                          className={`px-2 py-1 rounded text-xs ${formatUserStatus(selectedUser.user.userStatus).color}`}
                        >
                          {formatUserStatus(selectedUser.user.userStatus).label}
                        </span>
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">가입일</span>
                      <p>{formatDate(selectedUser.user.createdAt)}</p>
                    </div>
                    {selectedUser.user.deletedAt && (
                      <div>
                        <span className="text-gray-400">탈퇴일</span>
                        <p className="text-red-400">
                          {formatDate(selectedUser.user.deletedAt)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 구독 정보 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">구독 정보</h3>
                  {selectedUser.subscription ? (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">플랜</span>
                        <p>
                          <span
                            className={`px-2 py-1 rounded text-xs ${formatPlanType(selectedUser.subscription.planType).color}`}
                          >
                            {
                              formatPlanType(selectedUser.subscription.planType)
                                .label
                            }
                          </span>
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-400">상태</span>
                        <p>{selectedUser.subscription.subscriptionStatus}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">시작일</span>
                        <p>{formatDate(selectedUser.subscription.startedAt)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">만료일</span>
                        <p>{formatDate(selectedUser.subscription.expiresAt)}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">구독 정보 없음</p>
                  )}
                </div>

                {/* 결제 이력 */}
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">결제 이력</h3>
                  {selectedUser.paymentHistory.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.paymentHistory.map((payment) => (
                        <div
                          key={payment.paymentId}
                          className="flex items-center justify-between bg-gray-900 rounded p-4"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {payment.paymentMethod} ·{" "}
                              {formatDate(payment.requestAt)}
                            </p>
                          </div>
                          <span
                            className={`text-sm ${formatPaymentStatus(payment.paymentStatus).color}`}
                          >
                            {formatPaymentStatus(payment.paymentStatus).label}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm">결제 이력 없음</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
