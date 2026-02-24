import React, { useEffect, useState, useRef } from "react";
import {
  TrendingUp,
  History,
  Flame,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Content } from "@/types";
import { contentService } from "@/services/contentService";
import { useAuth } from "@/contexts/AuthContext";
import ContentCard from "@/components/ContentCard";
import ContentModal from "@/components/ContentModal";
import { useNavigate } from "react-router-dom";

type TabType = "all" | "original" | "creator";

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popularContents, setPopularContents] = useState<Content[]>([]);
  const [recommendedContents, setRecommendedContents] = useState<Content[]>([]);
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [chartScrollPosition, setChartScrollPosition] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialContents();
  }, [user]);

  const loadInitialContents = async () => {
    setLoading(true);
    try {
      const [popular, all] = await Promise.all([
        contentService.getPopularContents(10), // 10개로 변경
        contentService.getContents(),
      ]);

      setPopularContents(popular);
      setAllContents(all);

      // 추천 콘텐츠
      if (user && user.preferredTags.length > 0) {
        const recommended = await contentService.getRecommendedContents(
          user.id,
          user.preferredTags,
        );
        setRecommendedContents(recommended);
      }

      // 이어보기
      if (user) {
        const history = await contentService.getWatchHistory(user.id);
        const incomplete = history
          .filter((h) => !h.completed)
          .slice(0, 6)
          .map((h) => h.content);
        setContinueWatching(incomplete);
      }
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 필터링된 콘텐츠 (클라이언트 사이드 - 즉시 반영)
  const getFilteredContents = () => {
    let filtered = [...allContents];

    // 탭 필터링
    if (activeTab === "original") {
      filtered = filtered.filter((c) => c.type === "original");
    } else if (activeTab === "creator") {
      filtered = filtered.filter((c) => c.type === "creator");
    }

    return filtered;
  };

  const filteredContents = getFilteredContents();

  const handleChartScroll = (direction: "left" | "right") => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const scrollAmount = container.offsetWidth; // 한 화면 너비만큼 스크롤

    if (direction === "left") {
      container.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const updateScrollPosition = () => {
    if (chartContainerRef.current) {
      setChartScrollPosition(chartContainerRef.current.scrollLeft);
    }
  };

  const isAtStart = chartScrollPosition === 0;
  const isAtEnd = chartContainerRef.current
    ? chartScrollPosition >=
      chartContainerRef.current.scrollWidth -
        chartContainerRef.current.offsetWidth -
        10
    : false;

  const isSubscribed = user?.subscriptionType !== "none" || user?.isLGUPlus;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Hero Section */}
      <div className="relative h-[500px] bg-gradient-to-b from-gray-900 to-dark">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1600)",
            opacity: 0.3,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 h-full flex items-center">
          <div className="max-w-2xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-4">
              짧고 강렬한
              <br />
              <span className="text-primary">5분의 즐거움</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              1~5분의 짧은 러닝타임으로 즐기는 프리미엄 콘텐츠
            </p>
            {!user && (
              <button
                onClick={() => navigate("/signup")}
                className="btn-primary text-lg px-8 py-3 transition-transform hover:scale-105"
              >
                지금 시작하기
              </button>
            )}
            {user && !isSubscribed && (
              <button
                onClick={() => navigate("/subscribe")}
                className="btn-primary text-lg px-8 py-3 transition-transform hover:scale-105"
              >
                프리미엄 구독하기
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className="container mx-auto px-4 py-8 space-y-12"
        style={{ overflow: "visible" }}
      >
        {/* Continue Watching */}
        {continueWatching.length > 0 && (
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <History className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">이어서 시청하기</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {continueWatching.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onCardClick={setSelectedContent}
                />
              ))}
            </div>
          </section>
        )}

        {/* Popular Chart */}
        <section>
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold">실시간 인기 차트</h2>
          </div>
          <div className="relative group">
            {/* 왼쪽 화살표 */}
            {!isAtStart && (
              <button
                onClick={() => handleChartScroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* 오른쪽 화살표 */}
            {!isAtEnd && (
              <button
                onClick={() => handleChartScroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

            {/* 스크롤 컨테이너 */}
            <div
              ref={chartContainerRef}
              onScroll={updateScrollPosition}
              className="overflow-x-auto scrollbar-hide px-2"
              style={{
                scrollbarWidth: "none",
                msOverflowStyle: "none",
              }}
            >
              <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="flex gap-4 pb-4" style={{ width: "max-content" }}>
                {popularContents.map((content, index) => (
                  <div
                    key={content.id}
                    className="relative pt-2 pl-2"
                    style={{ width: "280px", flexShrink: 0 }}
                  >
                    <div className="absolute left-0 top-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center font-bold text-lg z-10 shadow-lg">
                      {index + 1}
                    </div>
                    <ContentCard
                      content={content}
                      onCardClick={setSelectedContent}
                      disableHover={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Recommended */}
        {user && recommendedContents.length > 0 && (
          <section>
            <div className="flex items-center space-x-2 mb-6">
              <Flame className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">
                {user.nickname}님을 위한 추천
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {recommendedContents.slice(0, 5).map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onCardClick={setSelectedContent}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <section>
          <div className="flex gap-4 mb-6 border-b border-gray-800">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "all"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              전체
              {activeTab === "all" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("original")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "original"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              오리지널
              {activeTab === "original" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("creator")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "creator"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              크리에이터
              {activeTab === "creator" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onCardClick={setSelectedContent}
              />
            ))}
          </div>

          {filteredContents.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              {!isSubscribed ? (
                <div>
                  <p className="mb-4">
                    프리미엄 콘텐츠를 보려면 구독이 필요합니다.
                  </p>
                  <button
                    onClick={() => navigate("/subscribe")}
                    className="btn-primary px-6 py-3"
                  >
                    구독하기
                  </button>
                </div>
              ) : (
                <p>콘텐츠가 없습니다.</p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* 콘텐츠 모달 */}
      {selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default HomePage;
