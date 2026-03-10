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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import { authService } from "@/services/authService";
import { bookmarkService } from "@/services/bookmarkService";
import {
  historyService,
  type WatchHistoryItem,
} from "@/services/historyService";
import type { Profile } from "@/types/profile";
import type { BookmarkItem } from "@/types/bookmark";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";
import type { Content } from "@/types";

type Tab = "profile" | "bookmarks" | "history" | "stats";

const MyPage: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
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

  // 시청 이력
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [hasMoreHistory, setHasMoreHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

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
      alert("북마크 삭제에 실패했습니다.");
    }
  };

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
      alert("시청 이력 삭제에 실패했습니다.");
    }
  };

  const handleContentClick = (bookmark: BookmarkItem) => {
    // BookmarkItem을 Content 타입으로 변환
    const content: Content = {
      id: bookmark.contentId.toString(),
      title: bookmark.title,
      thumbnailUrl: bookmark.thumbnailUrl,
      rating: 0,
      year: new Date().getFullYear(),
      duration: 0,
      description: "",
      tags: bookmark.category ? [bookmark.category] : [],
      accessLevel: "FREE",
      viewCount: 0,
      isSeries: bookmark.contentType === "SERIES",
    };
    setSelectedContent(content);
  };

  const bookmarkToContent = (bookmark: BookmarkItem): Content => {
    return {
      id: bookmark.contentId.toString(),
      title: bookmark.title,
      thumbnailUrl: bookmark.thumbnailUrl,
      rating: 0,
      year: new Date().getFullYear(),
      duration: 0,
      description: "",
      tags: bookmark.category ? [bookmark.category] : [],
      accessLevel: "FREE",
      viewCount: 0,
      isSeries: bookmark.contentType === "SERIES",
    };
  };

  const handleSaveNickname = async () => {
    if (!profile || !nickname.trim()) {
      alert("닉네임을 입력해주세요.");
      return;
    }

    try {
      await profileService.updateNickname(profile.userId, nickname);
      await loadProfile(); // 프로필 새로고침
      setEditMode(false);
      alert("닉네임이 변경되었습니다.");
    } catch (error: any) {
      console.error("닉네임 변경 실패:", error);

      // 백엔드 에러 메시지 추출
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "닉네임 변경에 실패했습니다.";
      alert(errorMessage);
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
      alert("이미지 크기는 5MB 이하만 가능합니다.");
      return;
    }

    // 확장자 추출
    const extension =
      "." + (file.name.split(".").pop()?.toLowerCase() || "png");
    if (![".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(extension)) {
      alert("jpg, png, gif, webp 형식만 지원합니다.");
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
      alert("프로필 이미지가 변경되었습니다.");
    } catch (error: any) {
      console.error("프로필 이미지 업로드 실패:", error);
      alert(error.response?.data?.message || "이미지 업로드에 실패했습니다.");
    } finally {
      setImageUploading(false);
      // input 초기화 (같은 파일 재선택 가능하도록)
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteAccount = async () => {
    if (!profile) return;
    if (
      !confirm("정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")
    ) {
      return;
    }
    try {
      await authService.deleteAccount(profile.userId.toString());
      logout();
      navigate("/");
      alert("회원 탈퇴가 완료되었습니다.");
    } catch (error: any) {
      console.error("회원 탈퇴 실패:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "회원 탈퇴에 실패했습니다.";
      alert(errorMessage);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
                    {profile.profileImageUrl ? (
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
                      {profile.subscriptionStatus === "NONE"
                        ? "미구독"
                        : "구독 중"}
                      {profile.isUPlusMember && " (U+ 회원)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">선호 태그</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.preferredTags.map((tag) => (
                        <span
                          key={tag.tagId}
                          className="bg-primary px-3 py-1 rounded-full text-sm"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
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

            {/* 구독 관리 */}
            {profile.subscriptionStatus === "NONE" &&
              !profile.isUPlusMember && (
                <div className="bg-gray-900 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-bold mb-3">
                    구독하고 더 많은 혜택을 누리세요
                  </h3>
                  <p className="text-gray-400 mb-4">
                    모든 콘텐츠 시청, 배속 재생, 광고 없음
                  </p>
                  <button
                    onClick={() => navigate("/subscribe")}
                    className="btn-primary"
                  >
                    구독하기
                  </button>
                </div>
              )}

            {/* 회원 탈퇴 */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-lg font-bold mb-3 text-red-500">회원 탈퇴</h3>
              <p className="text-gray-400 mb-4">
                탈퇴 시 모든 데이터가 삭제되며 복구할 수 없습니다.
              </p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {bookmarks.map((bookmark) => (
                    <ContentCard
                      key={bookmark.bookmarkId}
                      content={bookmarkToContent(bookmark)}
                      onCardClick={() => handleContentClick(bookmark)}
                      simpleHover={true}
                      onBookmarkToggle={handleBookmarkRemove}
                    />
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
          <div className="max-w-5xl mx-auto">
            {historyLoading && watchHistory.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : watchHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-4">시청 이력이 없습니다.</p>
                <button onClick={() => navigate("/")} className="btn-primary">
                  콘텐츠 둘러보기
                </button>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === "stats" && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">통계 기능은 추후 구현 예정입니다.</p>
            </div>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default MyPage;
