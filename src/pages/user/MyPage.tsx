import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  User,
  Bookmark,
  History,
  BarChart3,
  Settings,
  Camera,
  Trash2,
  Play,
  Clock,
  Crown,
  Check,
  Phone,
  Shield,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import { authService, type WithdrawalReason } from "@/services/authService";
import { bookmarkService } from "@/services/bookmarkService";
import { contentService } from "@/services/contentService";
import type { BookmarkItem, PlaylistItem } from "@/types/bookmark";
import {
  historyService,
  type WatchHistoryItem,
  type UserContentWatchHistoryGroup,
} from "@/services/historyService";
import { statsService, type WatchStatistics } from "@/services/historyService";
import {
  subscriptionService,
  type SubscriptionInfo,
} from "@/services/subscriptionService";
import {
  creatorService,
  type UserContentPlayInfo,
} from "@/services/creatorService";
import ConfirmModal from "@/components/common/ConfirmModal";
import AlertModal from "@/components/common/AlertModal";
import VideoPlayer from "@/components/common/VideoPlayer";
import type { Profile } from "@/types/profile";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";
import type { Content } from "@/types";

const bookmarkToContent = (bookmark: BookmarkItem): Content => ({
  id: bookmark.contentId.toString(),
  title: bookmark.title,
  thumbnailUrl: bookmark.thumbnailUrl,
  tags: bookmark.category ? [bookmark.category] : [],
  isSeries: bookmark.contentType === "SERIES",
  // Fill with default values for ContentCard compatibility
  description: "",
  viewCount: 0,
  bookmarkCount: 0,
  duration: 0,
  episodes: [],
  isOriginal: false,
});

type Tab = "profile" | "bookmarks" | "history" | "stats" | "subscription";

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const MyPage: React.FC = () => {
  const { user, loading: authLoading, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // URL 쿼리 파라미터에서 탭 읽기
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || "profile");

  // 탭 변경 시 URL 업데이트
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  // 프로필 편집
  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState("");

  // 북마크
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [bookmarkCursor, setBookmarkCursor] = useState<string | null>(null);
  const [hasMoreBookmarks, setHasMoreBookmarks] = useState(false);

  // 콘텐츠 모달
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [contentLoading, setContentLoading] = useState(false);

  // 플레이리스트 연속 재생
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [playlistLoading, setPlaylistLoading] = useState(false);

  // 북마크 선택 모드 (연속 재생용) - 배열로 선택 순서 유지
  const [selectMode, setSelectMode] = useState(false);
  const [selectedBookmarkIds, setSelectedBookmarkIds] = useState<number[]>([]);

  // 시청 이력
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // 크리에이터 시청 이력
  const [creatorWatchHistory, setCreatorWatchHistory] = useState<
    UserContentWatchHistoryGroup[]
  >([]);
  const [creatorHistoryLoading, setCreatorHistoryLoading] = useState(false);

  // 크리에이터 시청이력 상세 모달
  const [selectedCreatorHistory, setSelectedCreatorHistory] =
    useState<UserContentWatchHistoryGroup | null>(null);

  // 크리에이터 영상 재생
  const [playingVideo, setPlayingVideo] =
    useState<UserContentPlayInfo | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);

  // 구독 관련
  const [subInfo, setSubInfo] = useState<SubscriptionInfo | null>(null);
  const [loadingSub, setLoadingSub] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    message: string;
    type: "success" | "error" | "info";
    onClose?: () => void;
  } | null>(null);
  const showAlert = (
    message: string,
    type: "success" | "error" | "info" = "info",
    onClose?: () => void,
  ) => {
    setAlertModal({ message, type, onClose });
  };
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verifying, setVerifying] = useState(false);

  // 선호 태그 편집
  const [editingTags, setEditingTags] = useState(false);
  const [allTags, setAllTags] = useState<{ tagId: number; name: string }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [savingTags, setSavingTags] = useState(false);

  // 통계
  const [watchStats, setWatchStats] = useState<WatchStatistics | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // 탈퇴
  const [withdrawReason, setWithdrawReason] =
    useState<WithdrawalReason>("OTHER");

  useEffect(() => {
    // AuthContext 로딩 중이면 대기
    if (authLoading) return;

    if (!user) {
      navigate("/login");
      return;
    }
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (activeTab === "bookmarks" && user) {
      loadBookmarks();
    }
    if (activeTab === "history" && user) {
      loadWatchHistory();
      loadCreatorWatchHistory();
    }
    if (activeTab === "subscription" && user) {
      loadSubscription();
    }
    if (activeTab === "stats" && user) {
      loadWatchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, user]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await profileService.getMyProfile();
      setProfile(data);
      setNickname(data.nickname);
    } catch (error) {
      console.error("프로필 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async (cursor?: string) => {
    setLoading(true);
    try {
      const data = await bookmarkService.getBookmarks(cursor, 20);
      console.log("북마크 데이터:", data); // 디버깅용
      if (cursor) {
        // 더보기
        setBookmarks((prev) => [...prev, ...data.bookmarks]);
      } else {
        // 초기 로드
        setBookmarks(data.bookmarks);
      }
      setBookmarkCursor(data.nextCursor);
      setHasMoreBookmarks(data.hasNext);
    } catch (error) {
      console.error("북마크 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookmarkRemove = async (contentId: string) => {
    try {
      await bookmarkService.removeBookmark(parseInt(contentId));
      loadBookmarks();
    } catch (error) {
      console.error("북마크 삭제 실패:", error);
      showAlert("북마크 삭제에 실패했습니다.", "error");
    }
  };

  // === 플레이리스트 연속 재생 ===
  const startPlaylist = async () => {
    setPlaylistLoading(true);
    try {
      const data = await bookmarkService.getBookmarkPlaylist();
      if (data.playlist.length === 0) {
        showAlert("재생할 콘텐츠가 없습니다.", "info");
        return;
      }
      // 선택 모드면 선택한 콘텐츠만 필터링
      let filtered = data.playlist;
      if (selectMode && selectedBookmarkIds.length > 0) {
        // 선택 순서대로 콘텐츠를 정렬
        const orderMap = new Map(
          selectedBookmarkIds.map((id, idx) => [id, idx]),
        );
        filtered = data.playlist
          .filter((item) => orderMap.has(item.contentId))
          .sort(
            (a, b) => orderMap.get(a.contentId)! - orderMap.get(b.contentId)!,
          );
        if (filtered.length === 0) {
          showAlert("선택한 콘텐츠 중 재생 가능한 항목이 없습니다.", "info");
          return;
        }
      }
      // 콘텐츠(찜) 단위로 정렬하되, 같은 콘텐츠 내 에피소드 순서는 유지
      const grouped: Map<number, PlaylistItem[]> = new Map();
      const contentOrder: number[] = [];
      for (const item of filtered) {
        if (!grouped.has(item.contentId)) {
          grouped.set(item.contentId, []);
          contentOrder.push(item.contentId);
        }
        grouped.get(item.contentId)!.push(item);
      }
      // 선택 모드가 아닐 때만 콘텐츠 순서를 역순(최신순)으로
      if (!(selectMode && selectedBookmarkIds.length > 0)) {
        contentOrder.reverse();
      }
      const reordered = contentOrder.flatMap((id) => grouped.get(id)!);
      setPlaylist(reordered);
      setPlaylistIndex(0);
      setShowPlaylist(true);
      setSelectMode(false);
      setSelectedBookmarkIds([]);
    } catch (error) {
      console.error("플레이리스트 조회 실패:", error);
      showAlert("플레이리스트를 불러오는데 실패했습니다.", "error");
    } finally {
      setPlaylistLoading(false);
    }
  };

  const toggleBookmarkSelect = (contentId: number) => {
    setSelectedBookmarkIds((prev) => {
      const idx = prev.indexOf(contentId);
      if (idx !== -1) {
        return prev.filter((id) => id !== contentId);
      } else {
        return [...prev, contentId];
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedBookmarkIds.length === bookmarks.length) {
      setSelectedBookmarkIds([]);
    } else {
      setSelectedBookmarkIds(bookmarks.map((b) => b.contentId));
    }
  };

  const handlePlaylistNext = () => {
    if (playlistIndex < playlist.length - 1) {
      setPlaylistIndex((prev) => prev + 1);
    } else {
      // 마지막 영상 끝 → 플레이리스트 종료
      setShowPlaylist(false);
    }
  };

  const currentPlaylistItem = playlist[playlistIndex] || null;

  const loadWatchHistory = async (cursor?: number) => {
    setHistoryLoading(true);
    try {
      const data = await historyService.getWatchHistory(cursor, 20);
      if (cursor) {
        setWatchHistory((prev) => [...prev, ...data.watchHistory]);
      } else {
        setWatchHistory(data.watchHistory);
      }
      setHistoryCursor(data.nextCursor ? parseInt(data.nextCursor) : null);
      setHasMoreHistory(data.hasNext);
    } catch (error) {
      console.error("시청 이력 조회 실패:", error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (historyId: number) => {
    try {
      await historyService.deleteWatchHistory(historyId);
      setWatchHistory((prev) => prev.filter((h) => h.historyId !== historyId));
    } catch (error) {
      console.error("시청 이력 삭제 실패:", error);
      showAlert("시청 이력 삭제에 실패했습니다.", "error");
    }
  };

  const loadCreatorWatchHistory = async () => {
    setCreatorHistoryLoading(true);
    try {
      const data = await historyService.getUserContentWatchHistory();
      setCreatorWatchHistory(data);
    } catch (error) {
      console.error("크리에이터 시청 이력 조회 실패:", error);
    } finally {
      setCreatorHistoryLoading(false);
    }
  };

  const handlePlayCreatorVideo = async (userContentId: number) => {
    setVideoLoading(true);
    try {
      const playInfo = await creatorService.getPlayInfo(userContentId);
      setPlayingVideo(playInfo);
      // 재생 시작 시 상세 모달은 닫기
      setSelectedCreatorHistory(null);
    } catch (error) {
      console.error("영상 재생 정보 조회 실패:", error);
      showAlert("영상을 불러오는 데 실패했습니다.", "error");
    } finally {
      setVideoLoading(false);
    }
  };

  const handleContentClick = async (bookmark: BookmarkItem) => {
    if (contentLoading) return;
    setContentLoading(true);
    try {
      const fullContent = await contentService.getContentById(
        bookmark.contentId.toString(),
      );
      setSelectedContent(fullContent);
    } catch (error) {
      console.error("콘텐츠 상세 정보 조회 실패:", error);
      showAlert("콘텐츠 정보를 불러오는 데 실패했습니다.", "error");
    } finally {
      setContentLoading(false);
    }
  };

  const handleBookmarkPlay = (bookmark: BookmarkItem) => {
    navigate(`/content/${bookmark.contentId}`);
  };

  const handleSaveNickname = async () => {
    if (!profile || !nickname.trim()) {
      showAlert("닉네임을 입력해주세요.", "info");
      return;
    }

    try {
      await profileService.updateNickname(profile.userId, nickname);
      await loadProfile(); // 프로필 새로고침
      setEditMode(false);
      showAlert("닉네임이 변경되었습니다.", "success");
    } catch (error: any) {
      console.error("닉네임 변경 실패:", error);

      // 백엔드 에러 메시지 추출
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "닉네임 변경에 실패했습니다.";
      showAlert(errorMessage, "error");
    }
  };

  const [imageUploading, setImageUploading] = useState(false);

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showAlert("이미지 크기는 5MB 이하만 가능합니다.", "error");
      return;
    }

    // 확장자 추출
    const extension =
      "." + (file.name.split(".").pop()?.toLowerCase() || "png");
    if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension)) {
      showAlert("jpg, png, gif, webp 형식만 지원합니다.", "error");
      return;
    }

    setImageUploading(true);
    try {
      // 1. Presigned URL 발급
      const { uploadUrl, objectKey, contentType } =
        await profileService.getPresignedUrl(extension);

      // 2. S3에 이미지 업로드 (서명된 Content-Type과 일치시켜야 함)
      await profileService.uploadImageToS3(uploadUrl, file, contentType);

      // 3. 백엔드에 objectKey 저장
      await profileService.updateProfileImage({ objectKey });

      // 4. 프로필 새로고침
      await loadProfile();
      showAlert("프로필 이미지가 변경되었습니다.", "success");
    } catch (error: any) {
      console.error("프로필 이미지 업로드 실패:", error);
      showAlert(
        error.response?.data?.message || "이미지 업로드에 실패했습니다.",
        "error",
      );
    } finally {
      setImageUploading(false);
      // input 초기화 (같은 파일 재선택 가능하도록)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // === 통계 관련 함수 ===
  const loadWatchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await statsService.getWatchStatistics();
      setWatchStats(data);
    } catch (error) {
      console.error("시청 통계 조회 실패:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  const formatWatchTime = (seconds: number) => {
    if (!seconds) return "0분";
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}시간 ${mins}분`;
    return `${mins}분`;
  };

  // === 구독 관련 함수 ===
  const loadSubscription = async () => {
    setLoadingSub(true);
    try {
      const info = await subscriptionService.getMySubscription();
      setSubInfo(info);
    } catch {
      setSubInfo(null);
    } finally {
      setLoadingSub(false);
    }
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await subscriptionService.subscribe("CARD");
      showAlert("베이직 구독이 완료되었습니다!", "success");
      await refreshAuth();
      loadSubscription();
      loadProfile();
    } catch (error: any) {
      showAlert(
        error.response?.data?.message || "구독 처리 중 오류가 발생했습니다.",
        "error",
      );
    } finally {
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await subscriptionService.cancelSubscription();
      setShowCancelModal(false);
      showAlert(
        "구독 해지가 예약되었습니다. 만료일까지 이용 가능합니다.",
        "success",
      );
      await refreshAuth();
      loadSubscription();
      loadProfile();
    } catch (error: any) {
      showAlert(
        error.response?.data?.message || "구독 해지에 실패했습니다.",
        "error",
      );
    } finally {
      setCanceling(false);
    }
  };

  const handleVerifyUplus = async () => {
    if (!phoneNumber.trim()) {
      showAlert("전화번호를 입력해주세요.", "info");
      return;
    }
    const cleaned = phoneNumber.replace(/[^0-9]/g, "");
    if (cleaned.length < 10) {
      showAlert("올바른 전화번호를 입력해주세요.", "info");
      return;
    }
    setVerifying(true);
    try {
      const result = await subscriptionService.verifyUplus(cleaned);
      if (result.verified) {
        showAlert("LG U+ 회원 인증이 완료되었습니다!", "success");
        await refreshAuth();
        loadSubscription();
        loadProfile();
      } else {
        showAlert("LG U+ 회원이 아니거나 인증에 실패했습니다.", "error");
      }
    } catch (error: any) {
      showAlert(
        error.response?.data?.message || "인증에 실패했습니다.",
        "error",
      );
    } finally {
      setVerifying(false);
    }
  };

  const refreshAuth = async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        const { default: axios } = await import("axios");
        const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
        const response = await axios.post(
          `${baseUrl}/api/auth/reissue`,
          { refreshToken },
          { headers: { "Content-Type": "application/json" } },
        );
        const { accessToken, refreshToken: newRefresh } = response.data.data;
        localStorage.setItem("accessToken", accessToken);
        if (newRefresh) localStorage.setItem("refreshToken", newRefresh);

        // 프로필 다시 조회해서 AuthContext 유저 정보 갱신
        try {
          const freshProfile = await profileService.getMyProfile();
          await updateUser({
            isLGUPlus: freshProfile.isUPlusMember || false,
            paid: freshProfile.subscriptionStatus === "SUBSCRIBED",
            subscriptionType:
              freshProfile.subscriptionStatus === "SUBSCRIBED"
                ? "basic"
                : "none",
          });
        } catch {
          // 프로필 조회 실패는 무시
        }
      }
    } catch {
      // 재발급 실패는 무시
    }
  };

  // === 선호 태그 편집 함수 ===
  const startEditTags = async () => {
    try {
      const tags = await profileService.getAllTags();
      setAllTags(tags);
      setSelectedTagIds(
        new Set(profile?.preferredTags.map((t) => t.tagId) || []),
      );
      setEditingTags(true);
    } catch (error) {
      console.error("태그 목록 조회 실패:", error);
      showAlert("태그 목록을 불러오는데 실패했습니다.", "error");
    }
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        if (next.size >= 5) return prev;
        next.add(tagId);
      }
      return next;
    });
  };

  const savePreferredTags = async () => {
    setSavingTags(true);
    try {
      await profileService.updatePreferredTags(Array.from(selectedTagIds));
      await loadProfile();
      setEditingTags(false);
    } catch (error: any) {
      console.error("선호 태그 저장 실패:", error);
      showAlert(
        error.response?.data?.message || "선호 태그 저장에 실패했습니다.",
        "error",
      );
    } finally {
      setSavingTags(false);
    }
  };

  const subIsPaid = subInfo?.paid === true;
  const subIsUplus =
    user?.isLGUPlus === true || profile?.isUPlusMember === true;
  const subIsCanceled = subInfo?.subscriptionStatus === "CANCELED";

  const getMemberStatus = () => {
    if (subIsUplus) return "LG U+ 회원";
    if (subIsPaid) return "베이직 구독 회원";
    return "일반 회원";
  };

  const handleDeleteAccount = async () => {
    if (
      !confirm("정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")
    ) {
      return;
    }

    try {
      await authService.withdraw({
        reason: withdrawReason,
      });

      // 프론트 인증 정보 즉시 제거
      logout();

      // 로그인 페이지로 이동 + 안내 메시지 전달
      navigate("/login", {
        replace: true,
        state: {
          message: "회원 탈퇴가 완료되었습니다.",
        },
      });
    } catch (error: any) {
      console.error("회원 탈퇴 실패:", error);

      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "회원 탈퇴에 실패했습니다.";

      showAlert(errorMessage, "error");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">
            프로필 정보를 불러올 수 없습니다.
          </p>
          <button
            onClick={() => loadProfile()}
            className="btn-primary px-6 py-2"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const withdrawalReasonOptions: {
    label: string;
    value: WithdrawalReason;
  }[] = [
    { label: "요금이 비싸서", value: "PRICE" },
    { label: "콘텐츠가 부족해서", value: "CONTENT" },
    { label: "서비스 사용이 불편해서", value: "UX" },
    { label: "기타", value: "OTHER" },
  ];

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">마이페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => handleTabChange("profile")}
            className={`pb-4 px-4 transition-colors ${
              activeTab === "profile"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <User className="w-5 h-5 inline mr-2" />
            프로필
          </button>
          <button
            onClick={() => handleTabChange("bookmarks")}
            className={`pb-4 px-4 transition-colors ${
              activeTab === "bookmarks"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Bookmark className="w-5 h-5 inline mr-2" />
            찜한 콘텐츠
          </button>
          <button
            onClick={() => handleTabChange("history")}
            className={`pb-4 px-4 transition-colors ${
              activeTab === "history"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <History className="w-5 h-5 inline mr-2" />
            시청 이력
          </button>
          <button
            onClick={() => handleTabChange("stats")}
            className={`pb-4 px-4 transition-colors ${
              activeTab === "stats"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-5 h-5 inline mr-2" />
            통계
          </button>
          <button
            onClick={() => handleTabChange("subscription")}
            className={`pb-4 px-4 transition-colors ${
              activeTab === "subscription"
                ? "border-b-2 border-primary text-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Crown className="w-5 h-5 inline mr-2" />
            구독
          </button>
        </div>

        {/* 프로필 탭 */}
        {activeTab === "profile" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-900 rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">프로필 정보</h2>
                {!editMode && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="btn-secondary text-sm"
                  >
                    <Settings className="w-4 h-4 inline mr-1" />
                    편집
                  </button>
                )}
              </div>

              {/* 닉네임 변경 제한 안내 */}
              {profile.lastNicknameChangedAt &&
                (() => {
                  const lastChanged = new Date(profile.lastNicknameChangedAt);
                  const nextChangeDate = new Date(lastChanged);
                  nextChangeDate.setDate(nextChangeDate.getDate() + 30);
                  const now = new Date();
                  const canChange = now >= nextChangeDate;

                  if (!canChange) {
                    return (
                      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3 mb-4">
                        <p className="text-sm text-yellow-400">
                          닉네임은 30일마다 변경할 수 있습니다. 다음 변경
                          가능일: {nextChangeDate.toLocaleDateString("ko-KR")}
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

              {/* 프로필 이미지 */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden">
                    {profile.profileImageUrl &&
                    profile.profileImageUrl !== "null" &&
                    profile.profileImageUrl.startsWith("http") ? (
                      <img
                        src={profile.profileImageUrl}
                        alt="프로필"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-gray-600" />
                    )}
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={imageUploading}
                    className={`absolute bottom-0 right-0 p-2 rounded-full transition-colors ${
                      imageUploading
                        ? "bg-gray-600 cursor-not-allowed opacity-50"
                        : "bg-primary hover:bg-primary/80 cursor-pointer"
                    }`}
                    title="프로필 이미지 변경"
                  >
                    {imageUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      닉네임
                    </label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="input-field"
                      placeholder="닉네임을 입력하세요"
                      maxLength={20}
                    />
                    {profile.lastNicknameChangedAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        마지막 변경:{" "}
                        {new Date(
                          profile.lastNicknameChangedAt,
                        ).toLocaleDateString("ko-KR")}
                      </p>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={handleSaveNickname}
                      className="btn-primary"
                      disabled={
                        !nickname.trim() || nickname === profile.nickname
                      }
                    >
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setNickname(profile.nickname);
                      }}
                      className="btn-secondary"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400">이메일</p>
                    <p className="text-lg">{profile.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">닉네임</p>
                    <p className="text-lg">{profile.nickname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">구독 상태</p>
                    <p className="text-lg">
                      {profile.isUPlusMember
                        ? "LG U+ 회원"
                        : profile.subscriptionStatus === "SUBSCRIBED"
                          ? "베이직 구독 회원"
                          : "일반 회원"}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">선호 태그</p>
                      {!editingTags && (
                        <button
                          onClick={startEditTags}
                          className="text-xs text-primary hover:text-primary/80 transition-colors"
                        >
                          편집
                        </button>
                      )}
                    </div>
                    {editingTags ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          {selectedTagIds.size}개 선택됨 (최대 5개)
                        </p>
                        <div className="flex flex-wrap gap-2 mb-4">
                          {allTags.map((tag) => (
                            <button
                              key={tag.tagId}
                              onClick={() => toggleTag(tag.tagId)}
                              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                selectedTagIds.has(tag.tagId)
                                  ? "bg-primary text-white"
                                  : selectedTagIds.size >= 5
                                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                              }`}
                            >
                              {tag.name}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={savePreferredTags}
                            disabled={savingTags}
                            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingTags && (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            )}
                            저장
                          </button>
                          <button
                            onClick={() => setEditingTags(false)}
                            className="btn-secondary text-sm px-4 py-1.5"
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profile.preferredTags.length > 0 ? (
                          profile.preferredTags.map((tag) => (
                            <span
                              key={tag.tagId}
                              className="bg-primary px-3 py-1 rounded-full text-sm"
                            >
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-500 text-sm">
                            선호 태그가 없습니다. 편집을 눌러 추가해보세요.
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">가입일</p>
                    <p className="text-lg">
                      {new Date(profile.createdAt).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 회원 탈퇴 */}
            {/* 회원 탈퇴 */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3 text-red-500">회원 탈퇴</h3>
              <p className="text-gray-400 mb-4">
                탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>

              <div className="mb-5">
                <p className="text-sm text-gray-400 mb-3">탈퇴 사유</p>
                <div className="space-y-2">
                  {withdrawalReasonOptions.map((reason) => (
                    <label
                      key={reason.value}
                      className="flex items-center gap-2 text-sm text-white cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="withdrawReason"
                        value={reason.value}
                        checked={withdrawReason === reason.value}
                        onChange={(e) =>
                          setWithdrawReason(e.target.value as WithdrawalReason)
                        }
                      />
                      <span>{reason.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors flex items-center space-x-2"
              >
                <User className="w-4 h-4" />
                <span>회원 탈퇴</span>
              </button>
            </div>
          </div>
        )}

        {/* 찜한 콘텐츠 탭 */}
        {activeTab === "bookmarks" && (
          <div className="max-w-7xl mx-auto">
            {loading && bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">찜한 콘텐츠가 없습니다.</p>
                <button onClick={() => navigate("/")} className="btn-primary">
                  콘텐츠 둘러보기
                </button>
              </div>
            ) : (
              <>
                {/* 연속 재생 버튼 */}
                <div className="flex justify-end gap-2 mb-4">
                  {selectMode ? (
                    <>
                      <button
                        onClick={toggleSelectAll}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        {selectedBookmarkIds.length === bookmarks.length
                          ? "전체 해제"
                          : "전체 선택"}
                      </button>
                      <button
                        onClick={() => {
                          setSelectMode(false);
                          setSelectedBookmarkIds([]);
                        }}
                        className="btn-secondary flex items-center gap-2 text-sm"
                      >
                        취소
                      </button>
                      <button
                        onClick={startPlaylist}
                        disabled={
                          playlistLoading || selectedBookmarkIds.length === 0
                        }
                        className="btn-primary flex items-center gap-2 disabled:opacity-50"
                      >
                        {playlistLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        재생 ({selectedBookmarkIds.length})
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setSelectMode(true)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      연속 재생
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {bookmarks.map((bookmark) => (
                    <div key={bookmark.bookmarkId} className="relative">
                      {selectMode && (
                        <button
                          onClick={() =>
                            toggleBookmarkSelect(bookmark.contentId)
                          }
                          className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                            selectedBookmarkIds.includes(bookmark.contentId)
                              ? "bg-primary border-primary"
                              : "bg-black/50 border-white/60 hover:border-white"
                          }`}
                        >
                          {selectedBookmarkIds.includes(bookmark.contentId) && (
                            <span className="text-xs font-bold text-white">
                              {selectedBookmarkIds.indexOf(bookmark.contentId) +
                                1}
                            </span>
                          )}
                        </button>
                      )}
                      <div
                        className={
                          selectMode &&
                          !selectedBookmarkIds.includes(bookmark.contentId)
                            ? "opacity-50"
                            : ""
                        }
                      >
                        <ContentCard
                          content={bookmarkToContent(bookmark)}
                          onCardClick={() =>
                            selectMode
                              ? toggleBookmarkSelect(bookmark.contentId)
                              : handleContentClick(bookmark)
                          }
                          onPlayClick={() => handleBookmarkPlay(bookmark)}
                          simpleHover={!selectMode}
                          noScale={selectMode}
                          onBookmarkToggle={
                            selectMode ? undefined : handleBookmarkRemove
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {hasMoreBookmarks && (
                  <div className="text-center mt-8">
                    <button
                      onClick={() => loadBookmarks(bookmarkCursor ?? undefined)}
                      disabled={loading}
                      className="btn-secondary"
                    >
                      {loading ? "로딩 중..." : "더보기"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 시청 이력 탭 */}
        {activeTab === "history" && (
          <div className="max-w-7xl mx-auto">
            {(historyLoading || creatorHistoryLoading) &&
            watchHistory.length === 0 &&
            creatorWatchHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : watchHistory.length === 0 &&
              creatorWatchHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">시청 이력이 없습니다.</p>
                <button onClick={() => navigate("/")} className="btn-primary">
                  콘텐츠 둘러보기
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {/* 크리에이터 시청이력 */}
                {creatorWatchHistory.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">
                      크리에이터 시청이력
                    </h2>
                    <div className="flex space-x-4 overflow-x-auto pb-4 -mx-4 px-4">
                      {creatorWatchHistory.map((group) => (
                        <div
                          key={group.parentContentId}
                          className="w-72 flex-shrink-0 cursor-pointer group"
                          onClick={() => setSelectedCreatorHistory(group)}
                        >
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-800 mb-2">
                            <img
                              src={
                                group.parentThumbnailUrl ||
                                "https://via.placeholder.com/320x180?text=No+Image"
                              }
                              alt={group.parentTitle}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-10 h-10" />
                            </div>
                            <div className="absolute top-2 right-2 bg-black/70 rounded px-2 py-1 text-xs">
                              {group.watchHistories.length}개 영상
                            </div>
                          </div>
                          <h3 className="font-semibold truncate">
                            {group.parentTitle}
                          </h3>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* OTT 시청이력 */}
                {watchHistory.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-bold mb-4">OTT 시청이력</h2>
                    <div className="space-y-3">
                      {watchHistory.map((item) => (
                        <div
                          key={item.historyId}
                          className="bg-gray-900 rounded-lg p-4 flex items-center gap-4 hover:bg-gray-800/80 transition-colors"
                        >
                          <div
                            className="relative flex-shrink-0 cursor-pointer group"
                            onClick={() =>
                              navigate(
                                `/content/${item.contentId}${item.episodeId ? `?episode=${item.episodeId}` : ""}`,
                              )
                            }
                          >
                            <img
                              src={
                                item.thumbnailUrl ||
                                "https://via.placeholder.com/160x90?text=No+Image"
                              }
                              alt={item.title}
                              className="w-40 h-[90px] object-cover rounded"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                              <Play className="w-8 h-8 fill-current" />
                            </div>
                            {item.duration > 0 && (
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                                <div
                                  className="h-full bg-primary"
                                  style={{
                                    width: `${Math.min(item.progressPercent, 100)}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() =>
                              navigate(
                                `/content/${item.contentId}${item.episodeId ? `?episode=${item.episodeId}` : ""}`,
                              )
                            }
                          >
                            <h3 className="font-semibold text-base line-clamp-1 mb-1">
                              {item.title}
                              {item.episodeTitle && (
                                <span className="text-gray-400 font-normal">
                                  {" "}
                                  · {item.episodeNumber}화 {item.episodeTitle}
                                </span>
                              )}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                {formatDuration(item.lastPosition)} /{" "}
                                {formatDuration(item.duration)}
                              </span>
                              <span>{item.progressPercent}% 시청</span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${
                                  item.status === "COMPLETED"
                                    ? "bg-green-500/20 text-green-400"
                                    : item.status === "WATCHING"
                                      ? "bg-blue-500/20 text-blue-400"
                                      : "bg-gray-700 text-gray-400"
                                }`}
                              >
                                {item.status === "COMPLETED"
                                  ? "시청 완료"
                                  : item.status === "WATCHING"
                                    ? "시청 중"
                                    : "시작됨"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(item.watchedAt).toLocaleDateString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </p>
                          </div>

                          <button
                            onClick={() => handleDeleteHistory(item.historyId)}
                            className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400 transition-colors"
                            title="시청 이력 삭제"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {hasMoreHistory && (
                      <div className="text-center mt-8">
                        <button
                          onClick={() =>
                            loadWatchHistory(historyCursor ?? undefined)
                          }
                          disabled={historyLoading}
                          className="btn-secondary"
                        >
                          {historyLoading ? "로딩 중..." : "더보기"}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === "stats" && (
          <div className="max-w-4xl mx-auto">
            {statsLoading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : !watchStats ? (
              <div className="text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">
                  통계 데이터를 불러올 수 없습니다.
                </p>
              </div>
            ) : (
              <>
                {/* 요약 카드 */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-900 rounded-lg p-6 text-center">
                    <Play className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">
                      {watchStats.totalWatchedCount}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">시청 완료</p>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-6 text-center">
                    <Clock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold">
                      {formatWatchTime(watchStats.totalWatchTime)}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">총 시청 시간</p>
                  </div>
                </div>

                {/* 장르별 통계 */}
                <div className="bg-gray-900 rounded-lg p-6">
                  <h3 className="text-lg font-bold mb-6">장르별 시청 통계</h3>
                  {watchStats.statisticsByGenre.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">
                      아직 시청 데이터가 없습니다.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {watchStats.statisticsByGenre.map((genre) => (
                        <div key={genre.tagId}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">
                              {genre.tagName}
                            </span>
                            <span className="text-sm text-gray-400">
                              {genre.watchedCount}편 ·{" "}
                              {formatWatchTime(genre.watchTime)} ·{" "}
                              {genre.percentage}%
                            </span>
                          </div>
                          <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${genre.percentage}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {watchStats.updatedAt && (
                    <p className="text-xs text-gray-500 mt-6 text-right">
                      마지막 갱신:{" "}
                      {new Date(watchStats.updatedAt).toLocaleString("ko-KR")}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* 구독 탭 */}
        {activeTab === "subscription" && (
          <div className="max-w-4xl mx-auto">
            {loadingSub ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <div className="bg-gray-900 rounded-lg p-6 mb-8 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">구독 상태</p>
                    <p className="text-xl font-bold">{getMemberStatus()}</p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-bold ${
                      subIsUplus
                        ? "bg-green-500/20 text-green-400"
                        : subIsPaid
                          ? "bg-primary/20 text-primary"
                          : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {subIsUplus
                      ? "U+ 인증"
                      : subIsPaid
                        ? subIsCanceled
                          ? "해지 예약"
                          : "구독 중"
                        : "미구독"}
                  </span>
                </div>

                {/* FREE 사용자 현재 제한 안내 */}
                {!subIsPaid && !subIsUplus && (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5 mb-8">
                    <p className="text-sm font-semibold text-gray-300 mb-3">
                      현재 이용 가능 범위 (무료 회원)
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">무료 콘텐츠 시청</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                        <span className="text-gray-300">
                          사용자 업로드 콘텐츠 시청
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-gray-500">
                          유료/오리지널 콘텐츠 접근 불가
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-gray-500">배속 재생 불가</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                        <span className="text-gray-500">화질 제한</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-8">
                  {/* 카드 1: 베이직 구독 */}
                  <div className="bg-gray-900 rounded-lg p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold">베이직 구독</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          subIsPaid
                            ? "bg-primary/20 text-primary"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {subIsPaid
                          ? subIsCanceled
                            ? "해지 예약"
                            : "구독 중"
                          : "미구독"}
                      </span>
                    </div>

                    <div className="text-3xl font-bold text-primary mb-6">
                      ₩5,000
                      <span className="text-lg text-gray-400">/월</span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span>오리지널 · 사용자 업로드 콘텐츠 시청</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span>배속 재생 가능</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span>전체 화질 접근 가능</span>
                      </li>
                    </ul>

                    {subIsPaid && subInfo && (
                      <div className="bg-gray-800 rounded-lg p-4 mb-6 text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-400">시작일</span>
                          <span>
                            {new Date(subInfo.startedAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">만료일</span>
                          <span>
                            {new Date(subInfo.expiresAt).toLocaleDateString(
                              "ko-KR",
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">상태</span>
                          <span
                            className={
                              subIsCanceled
                                ? "text-yellow-400"
                                : "text-green-400"
                            }
                          >
                            {subIsCanceled
                              ? "해지 예약 (만료일까지 이용 가능)"
                              : "활성"}
                          </span>
                        </div>
                      </div>
                    )}

                    {subIsUplus ? (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
                        <Shield className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                        <p className="text-blue-400 font-semibold text-sm">
                          LG U+ 회원으로 인증되어 베이직 구독이 필요하지
                          않습니다.
                        </p>
                      </div>
                    ) : !subIsPaid ? (
                      <button
                        onClick={handleSubscribe}
                        disabled={subscribing}
                        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {subscribing ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            처리 중...
                          </>
                        ) : (
                          "베이직 플랜 구독하기"
                        )}
                      </button>
                    ) : subIsCanceled ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                        <p className="text-yellow-400 font-semibold text-sm">
                          해지 예약 상태입니다.
                          <br />
                          만료일까지 모든 혜택을 이용할 수 있습니다.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowCancelModal(true)}
                        disabled={canceling}
                        className="w-full py-3 rounded transition-colors bg-gray-700 hover:bg-gray-600 text-white"
                      >
                        구독 해지
                      </button>
                    )}
                  </div>

                  {/* 카드 2: LG U+ 회원 인증 */}
                  <div className="bg-gray-900 rounded-lg p-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold">LG U+ 회원 인증</h2>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          subIsUplus
                            ? "bg-green-500/20 text-green-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {subIsUplus ? "인증 완료" : "미인증"}
                      </span>
                    </div>

                    <p className="text-gray-400 mb-6">
                      LG U+ 회원 인증 시 제공되는 혜택/연동 안내
                    </p>

                    <ul className="space-y-3 mb-8">
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span>베이직 구독의 모든 혜택 포함</span>
                      </li>
                      <li className="flex items-start">
                        <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                        <span>LG U+ 전용 콘텐츠 시청 가능</span>
                      </li>
                    </ul>

                    {subIsUplus ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
                        <Shield className="w-8 h-8 text-green-400 mx-auto mb-2" />
                        <p className="text-green-400 font-semibold">
                          인증 완료
                        </p>
                      </div>
                    ) : subIsPaid ? (
                      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 text-center">
                        <Crown className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                        <p className="text-yellow-400 font-semibold text-sm">
                          베이직 구독 중에는 U+ 인증을 할 수 없습니다.
                          <br />
                          {subIsCanceled
                            ? "구독 만료 후 인증해주세요."
                            : "구독 해지 후 인증해주세요."}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">
                            <Phone className="w-4 h-4 inline mr-1" />
                            전화번호 입력
                          </label>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="01012345678"
                            className="w-full input-field"
                            maxLength={13}
                          />
                        </div>

                        <button
                          onClick={handleVerifyUplus}
                          disabled={verifying || !phoneNumber.trim()}
                          className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {verifying ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              인증 중...
                            </>
                          ) : (
                            "LG U+ 회원 인증하기"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 플레이리스트 연속 재생 모달 */}
      {showPlaylist && currentPlaylistItem && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          {/* 상단 바 */}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-900/80">
            <div className="flex items-center gap-3 min-w-0">
              <Play className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">
                  {currentPlaylistItem.title}
                  {currentPlaylistItem.episodeTitle && (
                    <span className="text-gray-400 font-normal">
                      {" "}
                      · {currentPlaylistItem.episodeTitle}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {playlistIndex + 1} / {playlist.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPlaylist(false)}
              className="text-gray-400 hover:text-white transition-colors text-sm px-3 py-1"
            >
              닫기
            </button>
          </div>

          {/* 비디오 플레이어 */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full max-w-5xl">
              <VideoPlayer
                videoUrl={currentPlaylistItem.videoUrl || ""}
                startTime={currentPlaylistItem.lastPosition}
                autoPlay={true}
                onEnded={handlePlaylistNext}
              />
            </div>
          </div>

          {/* 하단 플레이리스트 큐 */}
          <div className="bg-gray-900/80 px-6 py-3">
            <div className="flex gap-3 overflow-x-auto pb-1">
              {playlist.map((item, idx) => (
                <button
                  key={`${item.contentId}-${item.episodeId ?? "s"}-${idx}`}
                  onClick={() => setPlaylistIndex(idx)}
                  className={`flex-shrink-0 w-48 rounded-lg overflow-hidden transition-all ${
                    idx === playlistIndex
                      ? "ring-2 ring-primary"
                      : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="relative">
                    <img
                      src={
                        item.thumbnailUrl ||
                        "https://via.placeholder.com/192x108?text=No+Image"
                      }
                      alt={item.title}
                      className="w-full h-[108px] object-cover"
                    />
                    {item.progressPercent > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${item.progressPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-gray-800 text-left">
                    <p className="text-xs truncate">{item.title}</p>
                    {item.episodeTitle && (
                      <p className="text-xs text-gray-500 truncate">
                        {item.episodeTitle}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 콘텐츠 모달 */}
      {selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={() => {
            setSelectedContent(null);
            // 북마크 탭이면 목록 새로고침
            if (activeTab === "bookmarks") {
              loadBookmarks();
            }
          }}
        />
      )}

      {/* 구독 해지 확인 모달 */}
      {showCancelModal && (
        <ConfirmModal
          message="정말 구독을 해지하시겠습니까? 만료일까지는 계속 이용 가능합니다."
          confirmText="해지"
          cancelText="취소"
          onConfirm={handleCancel}
          onCancel={() => setShowCancelModal(false)}
        />
      )}

      {/* 알림 모달 */}
      {alertModal && (
        <AlertModal
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => {
            const cb = alertModal.onClose;
            setAlertModal(null);
            cb?.();
          }}
        />
      )}

      {/* 크리에이터 시청이력 상세 모달 */}
      {selectedCreatorHistory && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCreatorHistory(null)}
        >
          <div
            className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl h-full max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
              <h2 className="text-2xl font-bold">
                {selectedCreatorHistory.parentTitle}
              </h2>
              <button
                onClick={() => setSelectedCreatorHistory(null)}
                className="p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                {selectedCreatorHistory.watchHistories.map((item) => (
                  <div
                    key={item.historyId}
                    className="cursor-pointer group"
                    onClick={() => handlePlayCreatorVideo(item.userContentId)}
                  >
                    <div className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-800 mb-2 transition-all duration-300 group-hover:ring-2 ring-primary">
                      <img
                        src={
                          item.thumbnailUrl ||
                          "https://via.placeholder.com/270x480?text=No+Image"
                        }
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(item.lastWatchedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 크리에이터 영상 재생 모달 */}
      {(playingVideo || videoLoading) && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center">
          {videoLoading ? (
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          ) : (
            playingVideo && (
              <div className="relative w-full h-full max-w-md mx-auto flex flex-col justify-center">
                <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent z-10">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="font-semibold text-lg leading-tight">
                      {playingVideo.title}
                    </h3>
                    <button
                      onClick={() => setPlayingVideo(null)}
                      className="p-2 rounded-full bg-black/30 hover:bg-black/60 transition-colors flex-shrink-0"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="w-full h-full [&>div]:!h-full">
                  <VideoPlayer
                    videoUrl={playingVideo.url || ""}
                    autoPlay={true}
                    shortsMode={true}
                    onEnded={() => setPlayingVideo(null)}
                    startTime={
                      playingVideo.playbackState?.startPositionSec ?? 0
                    }
                  />
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default MyPage;
