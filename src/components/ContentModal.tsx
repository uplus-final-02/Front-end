import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  Play,
  Bookmark,
  Volume2,
  VolumeX,
  Info,
  ChevronRight,
} from "lucide-react";
import { Content, Episode } from "@/types";
import { contentService } from "@/services/contentService";
import { useAuth } from "@/contexts/AuthContext";

interface ContentModalProps {
  content: Content;
  onClose: () => void;
}

const ContentModal: React.FC<ContentModalProps> = ({ content, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    checkBookmark();
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const checkBookmark = async () => {
    if (!user) return;
    try {
      const bookmarked = await contentService.isBookmarked(user.id, content.id);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("찜하기 확인 실패:", error);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    try {
      const bookmarked = await contentService.toggleBookmark(
        user.id,
        content.id,
      );
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("찜하기 실패:", error);
    }
  };

  const handlePlay = () => {
    navigate(`/content/${content.id}?autoplay=true&fullscreen=true`);
  };

  const handleViewDetail = () => {
    navigate(`/content/${content.id}`);
  };

  const handleEpisodeClick = (episodeId: string) => {
    navigate(`/content/${content.id}`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

  const canWatch = user?.subscriptionType !== "none" || !content.isOriginal;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 rounded-lg shadow-2xl scrollbar-hide">
        <style>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center bg-gray-900/80 hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* 히어로 섹션 */}
        <div className="relative aspect-video">
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />

          {/* 컨트롤 */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h2 className="text-4xl font-bold mb-4">{content.title}</h2>
            <div className="flex items-center space-x-3">
              {canWatch ? (
                <button
                  onClick={handlePlay}
                  className="flex items-center space-x-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>재생</span>
                </button>
              ) : (
                <button
                  onClick={() => navigate("/subscribe")}
                  className="flex items-center space-x-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
                >
                  <Info className="w-6 h-6" />
                  <span>구독 필요</span>
                </button>
              )}

              {!content.isSeries && (
                <button
                  onClick={handleViewDetail}
                  className="flex items-center space-x-2 bg-gray-800/80 hover:bg-gray-700 text-white px-6 py-3 rounded font-semibold transition-colors"
                >
                  <span>상세보기</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              <button
                onClick={handleToggleBookmark}
                className="w-12 h-12 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors"
              >
                <Bookmark
                  className={`w-6 h-6 ${isBookmarked ? "fill-current" : ""}`}
                />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-12 h-12 flex items-center justify-center bg-gray-800/80 hover:bg-gray-700 rounded-full transition-colors ml-auto"
              >
                {isMuted ? (
                  <VolumeX className="w-6 h-6" />
                ) : (
                  <Volume2 className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 정보 섹션 */}
        <div className="p-8">
          <div className="grid grid-cols-3 gap-8">
            <div className="col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <span className="text-green-500 font-semibold">
                  {content.viewCount.toLocaleString()} 조회
                </span>
                <span className="text-gray-400">
                  {formatDuration(content.duration)}
                </span>
                {content.isOriginal && (
                  <span className="bg-primary px-2 py-1 rounded text-xs font-bold">
                    오리지널
                  </span>
                )}
                {content.isSeries && (
                  <span className="bg-blue-600 px-2 py-1 rounded text-xs font-bold">
                    시리즈
                  </span>
                )}
              </div>

              <p className="text-gray-300 leading-relaxed mb-4">
                {content.description}
              </p>
            </div>

            <div className="col-span-1">
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500">업로더: </span>
                  <span className="text-gray-300">{content.uploaderName}</span>
                </div>
                <div>
                  <span className="text-gray-500">태그: </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {content.tags.map((tag, index) => (
                      <span key={index} className="text-gray-300">
                        #{tag}
                        {index < content.tags.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 시리즈 에피소드 목록 */}
          {content.isSeries &&
            content.episodes &&
            content.episodes.length > 0 && (
              <div className="mt-8 border-t border-gray-800 pt-8">
                <h3 className="text-2xl font-bold mb-4">에피소드</h3>
                <div className="space-y-3">
                  {content.episodes.map((episode) => (
                    <div
                      key={episode.id}
                      onClick={() => handleEpisodeClick(episode.id)}
                      className="flex items-start space-x-4 p-4 bg-gray-800 hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group"
                    >
                      <div className="flex-shrink-0 relative">
                        <img
                          src={episode.thumbnailUrl}
                          alt={episode.title}
                          className="w-32 h-18 object-cover rounded"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                          <Play className="w-8 h-8 fill-current" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-lg">
                            {episode.title}
                          </h4>
                          <span className="text-sm text-gray-400 ml-2">
                            {formatDuration(episode.duration)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2">
                          {episode.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ContentModal;
