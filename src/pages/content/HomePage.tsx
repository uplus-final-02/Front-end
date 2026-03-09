import React, { useEffect, useState, useRef } from "react";
import {
  TrendingUp,
  History,
  Flame,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ArrowRight,
} from "lucide-react";
import { Content } from "@/types";
import { contentService } from "@/services/contentService";
import { useAuth } from "@/contexts/AuthContext";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";
import { useNavigate } from "react-router-dom";

const HomePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [popularContents, setPopularContents] = useState<Content[]>([]);
  const [recommendedContents, setRecommendedContents] = useState<Content[]>([]);
  const [originalContents, setOriginalContents] = useState<Content[]>([]);
  const [continueWatching, setContinueWatching] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [chartScrollPosition, setChartScrollPosition] = useState(0);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialContents();
  }, [user]);

  const loadInitialContents = async () => {
    setLoading(true);
    try {
      // 실시간 인기 차트 가져오기
      const trendingContents = await contentService.getTrendingContents(10);
      console.log("인기 차트:", trendingContents);
      setPopularContents(trendingContents);

      // 전체 콘텐츠 가져오기
      const allContents = await contentService.getDefaultContentList({
        page: 0,
        size: 50, // 충분히 많이 가져오기
      });
      console.log("전체 콘텐츠:", allContents);

      // 필터링 없이 전체 콘텐츠 중 15개만 오리지널 섹션에 표시
      setOriginalContents(allContents.slice(0, 15));

      // 사용자 로그인 시 추천 콘텐츠 API 호출
      if (user) {
        try {
          const recommendedData =
            await contentService.getRecommendedContents(false);
          setRecommendedContents(recommendedData.items);
        } catch (error) {
          console.error("추천 콘텐츠 조회 실패:", error);
          setRecommendedContents([]);
        }
      }

      // 이어보기
      if (user) {
        const watching = await contentService.getWatchingContentList();
        setContinueWatching(watching);
      }
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
      setOriginalContents([]);
      setPopularContents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChartScroll = (direction: "left" | "right") => {
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const scrollAmount = container.offsetWidth;

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
            {!isAtStart && (
              <button
                onClick={() => handleChartScroll("left")}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {!isAtEnd && (
              <button
                onClick={() => handleChartScroll("right")}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-black/80 hover:bg-black rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}

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

        {/* Original Contents */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">오리지널 콘텐츠</h2>
              <button
                onClick={() => navigate("/original")}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <span>모두보기</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {originalContents.length === 0 ? (
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {originalContents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onCardClick={setSelectedContent}
                />
              ))}
            </div>
          )}
        </section>
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

export default HomePage;
