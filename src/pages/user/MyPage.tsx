import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bookmark,
  History,
  BarChart3,
  Settings,
  Camera,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileService } from "@/services/profileService";
import { authService } from "@/services/authService";
import { bookmarkService } from "@/services/bookmarkService";
import type { Profile } from "@/types/profile";
import type { BookmarkItem } from "@/types/bookmark";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";
import type { Content } from "@/types";

type Tab = "profile" | "bookmarks" | "history" | "stats";

const MyPage: React.FC = () => {
  const { user, loading: authLoading, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<Tab>("profile");
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
      // 북마크 목록 새로고침
      loadBookmarks();
    } catch (error) {
      console.error("북마크 삭제 실패:", error);
      alert("북마크 삭제에 실패했습니다.");
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

  const handleImageUpload = async (
    _event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    // 프로필 이미지 업로드는 백엔드 API 배포 후 활성화 예정
    alert("프로필 이미지 업로드 기능은 백엔드 API 배포 후 사용 가능합니다.");
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

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">마이페이지</h1>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("profile")}
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
            onClick={() => setActiveTab("bookmarks")}
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
            onClick={() => setActiveTab("history")}
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
            onClick={() => setActiveTab("stats")}
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
                    onClick={() =>
                      alert(
                        "프로필 이미지 업로드 기능은 백엔드 API 배포 후 사용 가능합니다.",
                      )
                    }
                    disabled={true}
                    className="absolute bottom-0 right-0 bg-gray-600 p-2 rounded-full cursor-not-allowed opacity-50"
                    title="준비 중"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled
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
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">
                시청 이력 기능은 추후 구현 예정입니다.
              </p>
            </div>
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
