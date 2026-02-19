import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Bookmark,
  History,
  BarChart3,
  Settings,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { contentService } from "@/services/contentService";
import { authService } from "@/services/authService";
import { SYSTEM_TAGS } from "@/services/mockData";
import { Content, WatchHistory } from "@/types";
import ContentCard from "@/components/ContentCard";
import ContentModal from "@/components/ContentModal";

type Tab = "profile" | "bookmarks" | "history" | "stats";

const MyPage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [bookmarks, setBookmarks] = useState<Content[]>([]);
  const [watchHistory, setWatchHistory] = useState<
    (WatchHistory & { content: Content })[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  // 프로필 편집
  const [editMode, setEditMode] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || "");
  const [selectedTags, setSelectedTags] = useState<string[]>(
    user?.preferredTags || [],
  );

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (activeTab === "bookmarks") {
        const data = await contentService.getBookmarks(user.id);
        setBookmarks(data.map((b) => b.content));
      } else if (activeTab === "history") {
        const data = await contentService.getWatchHistory(user.id);
        setWatchHistory(data);
      }
    } catch (error) {
      console.error("데이터 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateUser({
        nickname,
        preferredTags: selectedTags,
      });
      setEditMode(false);
      alert("프로필이 업데이트되었습니다.");
    } catch (error) {
      alert("프로필 업데이트에 실패했습니다.");
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (
      !confirm("정말로 회원 탈퇴하시겠습니까? 이 작업은 되돌릴 수 없습니다.")
    ) {
      return;
    }
    try {
      await authService.deleteAccount(user.id);
      logout();
      navigate("/");
      alert("회원 탈퇴가 완료되었습니다.");
    } catch (error) {
      alert("회원 탈퇴에 실패했습니다.");
    }
  };

  const calculateStats = () => {
    const tagCounts: { [key: string]: number } = {};
    let totalWatchTime = 0;

    watchHistory.forEach((h) => {
      totalWatchTime += h.lastPosition;
      h.content.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    return {
      totalContents: watchHistory.length,
      totalWatchTime: Math.floor(totalWatchTime / 60), // 분 단위
      tagCounts: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  };

  if (!user) return null;

  const stats = calculateStats();

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
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-3">
                      선호 태그
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {SYSTEM_TAGS.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                            selectedTags.includes(tag)
                              ? "bg-primary text-white"
                              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button onClick={handleSaveProfile} className="btn-primary">
                      저장
                    </button>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setNickname(user.nickname);
                        setSelectedTags(user.preferredTags);
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
                    <p className="text-lg">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">닉네임</p>
                    <p className="text-lg">{user.nickname}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">구독 상태</p>
                    <p className="text-lg">
                      {user.subscriptionType === "none" ? "미구독" : "구독 중"}
                      {user.isLGUPlus && " (LG U+ 회원)"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-2">선호 태그</p>
                    <div className="flex flex-wrap gap-2">
                      {user.preferredTags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-primary px-3 py-1 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">가입일</p>
                    <p className="text-lg">
                      {new Date(user.joinDate).toLocaleDateString("ko-KR")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 구독 관리 */}
            {user.subscriptionType === "none" && !user.isLGUPlus && (
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
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded transition-colors"
              >
                <Trash2 className="w-4 h-4 inline mr-2" />
                회원 탈퇴
              </button>
            </div>
          </div>
        )}

        {/* 찜한 콘텐츠 탭 */}
        {activeTab === "bookmarks" && (
          <div className="max-w-7xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : bookmarks.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">찜한 콘텐츠가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {bookmarks.map((content) => (
                  <ContentCard
                    key={content.id}
                    content={content}
                    onCardClick={setSelectedContent}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 시청 이력 탭 */}
        {activeTab === "history" && (
          <div className="max-w-5xl mx-auto">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : watchHistory.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">시청 이력이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {watchHistory.map((history) => (
                  <div
                    key={history.id}
                    className="bg-gray-900 rounded-lg p-4 flex items-center space-x-4 hover:bg-gray-800 transition-colors cursor-pointer"
                    onClick={() => navigate(`/content/${history.contentId}`)}
                  >
                    <img
                      src={history.content.thumbnailUrl}
                      alt={history.content.title}
                      className="w-40 h-24 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg mb-2">
                        {history.content.title}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {new Date(history.watchedAt).toLocaleDateString(
                          "ko-KR",
                        )}{" "}
                        시청
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${(history.lastPosition / history.content.duration) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.floor(
                          (history.lastPosition / history.content.duration) *
                            100,
                        )}
                        % 시청
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 통계 탭 */}
        {activeTab === "stats" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">총 시청 콘텐츠</p>
                <p className="text-3xl font-bold text-primary">
                  {stats.totalContents}개
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">총 시청 시간</p>
                <p className="text-3xl font-bold text-primary">
                  {stats.totalWatchTime}분
                </p>
              </div>
              <div className="bg-gray-900 rounded-lg p-6">
                <p className="text-sm text-gray-400 mb-2">찜한 콘텐츠</p>
                <p className="text-3xl font-bold text-primary">
                  {bookmarks.length}개
                </p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-6">태그별 시청 통계</h3>
              {stats.tagCounts.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  시청 이력이 없습니다.
                </p>
              ) : (
                <div className="space-y-4">
                  {stats.tagCounts.map(([tag, count]) => (
                    <div key={tag}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{tag}</span>
                        <span className="text-sm text-gray-400">{count}개</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-3">
                        <div
                          className="bg-primary h-3 rounded-full transition-all"
                          style={{
                            width: `${(count / stats.tagCounts[0][1]) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default MyPage;
