import React, { useState } from "react";
import { Eye, Bookmark, Trash2 } from "lucide-react";
import { Content } from "@/types";

interface ContentCardProps {
  content: Content;
  onCardClick?: (content: Content) => void;
  onPlayClick?: (content: Content) => void;
  disableHover?: boolean;
  simpleHover?: boolean; // 호버 시 간소화 모드 (북마크용)
  noScale?: boolean; // 호버 시 확대 효과만 비활성화
  onBookmarkToggle?: (contentId: string) => void; // 북마크 토글 콜백
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onCardClick,
  onPlayClick,
  disableHover = false,
  simpleHover = false,
  noScale = false,
  onBookmarkToggle: _onBookmarkToggle,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // 안전한 필드 접근
  const thumbnailUrl = content.thumbnailUrl || content.thumbnail || "";
  const description = content.description || "";
  const viewCount = content.viewCount || 0;
  const bookmarkCount = content.bookmarkCount || 0;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsClicked(true);
    setIsHovered(false);
    if (onCardClick) {
      onCardClick(content);
    }
    setTimeout(() => setIsClicked(false), 100);
  };

  // 호버 비활성화 모드 (인기차트용)
  if (disableHover) {
    return (
      <div onClick={handleClick} className="card cursor-pointer">
        <div className="relative aspect-video overflow-hidden">
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          {content.isOriginal && (
            <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded text-xs font-bold">
              오리지널
            </div>
          )}
          {content.isSeries && (
            <div className="absolute top-2 right-2 bg-blue-600 px-2 py-1 rounded text-xs font-bold">
              시리즈
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {content.title}
          </h3>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{viewCount.toLocaleString()}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Bookmark className="w-3 h-3" />
                <span>{bookmarkCount.toLocaleString()}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 삭제된 콘텐츠 모드 (북마크에서 삭제된 콘텐츠 표시)
  if (content.isDeleted) {
    return (
      <div
        className="cursor-default relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative aspect-video overflow-hidden rounded-lg">
          <img
            src={thumbnailUrl || "/placeholder.png"}
            alt={content.title}
            className="w-full h-full object-cover filter blur-sm brightness-50"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="bg-black/70 text-gray-300 text-sm px-3 py-1.5 rounded">
              삭제된 콘텐츠
            </span>
          </div>
          {/* 호버 시 휴지통 삭제 버튼 */}
          {isHovered && _onBookmarkToggle && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  _onBookmarkToggle(content.id);
                }}
                className="bg-red-600 hover:bg-red-500 text-white p-3 rounded-full transition-colors"
                title="북마크에서 삭제"
              >
                <Trash2 className="w-6 h-6" />
              </button>
            </div>
          )}
        </div>
        <h3 className="font-semibold text-base mt-2 line-clamp-1 text-gray-500">
          {content.title}
        </h3>
      </div>
    );
  }

  // 일반 모드 (호버 확대 기능)
  return (
    <div
      className="cursor-pointer relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 기본 상태 */}
      <div onClick={handleClick}>
        <div className="relative aspect-video overflow-hidden rounded-lg">
          <img
            src={thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
          {content.isOriginal && (
            <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded text-xs font-bold">
              오리지널
            </div>
          )}
          {content.isSeries && (
            <div className="absolute top-2 right-2 bg-blue-600 px-2 py-1 rounded text-xs font-bold">
              시리즈
            </div>
          )}
        </div>
        <h3 className="font-semibold text-base mt-2 line-clamp-1">
          {content.title}
        </h3>
      </div>

      {/* 호버 시 확대 카드 */}
      {!noScale && (
        <div
          onClick={handleClick}
          className="absolute top-1/2 left-1/2 w-full bg-gray-900 rounded-lg shadow-2xl border border-gray-800"
          style={{
            transform: isHovered
              ? "translate(-50%, -50%) scale(1.2)"
              : "translate(-50%, -50%) scale(1)",
            opacity: isHovered ? 1 : 0,
            transition: isClicked ? "none" : "all 0.3s ease-out",
            zIndex: isHovered ? 100 : -1,
            pointerEvents: isHovered ? "auto" : "none",
          }}
        >
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <img
              src={thumbnailUrl}
              alt={content.title}
              className="w-full h-full object-cover"
            />
            {content.isOriginal && (
              <div className="absolute top-2 left-2 bg-primary px-2 py-1 rounded text-xs font-bold">
                오리지널
              </div>
            )}
            {content.isSeries && (
              <div className="absolute top-2 right-2 bg-blue-600 px-2 py-1 rounded text-xs font-bold">
                시리즈
              </div>
            )}
          </div>
          {simpleHover ? (
            // 간소화 모드: 제목 + 재생 버튼 + 북마크 토글
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-3 line-clamp-1">
                {content.title}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPlayClick) {
                      onPlayClick(content);
                    } else {
                      handleClick(e);
                    }
                  }}
                  className="flex-1 bg-white text-black px-4 py-2 rounded font-semibold hover:bg-gray-200 transition-colors text-sm"
                >
                  재생
                </button>
                {_onBookmarkToggle && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      _onBookmarkToggle(content.id);
                    }}
                    className="p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                    title="북마크 삭제"
                  >
                    <Bookmark className="w-5 h-5 text-primary fill-primary" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            // 일반 모드: 모든 정보 표시
            <div className="p-4">
              <h3 className="font-semibold text-lg mb-2 line-clamp-1">
                {content.title}
              </h3>
              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {description}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <Eye className="w-3 h-3" />
                    <span>{viewCount.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Bookmark className="w-3 h-3" />
                    <span>{bookmarkCount.toLocaleString()}</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {content.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-800 px-2 py-1 rounded text-xs text-gray-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContentCard;
