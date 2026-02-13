import React, { useState } from "react";
import { Clock, Eye, Bookmark } from "lucide-react";
import { Content } from "@/types";

interface ContentCardProps {
  content: Content;
  onCardClick?: (content: Content) => void;
  disableHover?: boolean;
}

const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onCardClick,
  disableHover = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-1 rounded text-xs flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{formatDuration(content.duration)}</span>
          </div>
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
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {content.description}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{content.viewCount.toLocaleString()}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Bookmark className="w-3 h-3" />
                <span>{content.bookmarkCount.toLocaleString()}</span>
              </span>
            </div>
            <span className="text-gray-600">{content.uploaderName}</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
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
            src={content.thumbnailUrl}
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
            src={content.thumbnailUrl}
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
        <div className="p-4">
          <h3 className="font-semibold text-lg mb-2 line-clamp-1">
            {content.title}
          </h3>
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">
            {content.description}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
            <div className="flex items-center space-x-3">
              <span className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(content.duration)}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Eye className="w-3 h-3" />
                <span>{content.viewCount.toLocaleString()}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Bookmark className="w-3 h-3" />
                <span>{content.bookmarkCount.toLocaleString()}</span>
              </span>
            </div>
            <span className="text-gray-600">{content.uploaderName}</span>
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
      </div>
    </div>
  );
};

export default ContentCard;
