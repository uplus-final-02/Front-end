import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  Share2,
  Bookmark,
  Info,
  X,
  Send,
  User,
  Eye,
  Clock,
  Tag,
  Calendar,
  Loader2,
  Film,
} from "lucide-react";
import VideoPlayer from "@/components/common/VideoPlayer";
import ContentModal from "@/components/content/ContentModal";
import { contentService } from "@/services/contentService";
import {
  creatorService,
  FeedItem,
  UserContentPlayInfo,
  Comment,
} from "@/services/creatorService";
import type { Content } from "@/types";

// ── 유틸 ──

const formatTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "방금 전";
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
};

const formatDuration = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatCount = (n: number) => {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toString();
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")}`;
};

/** description JSON 안전하게 문자열로 변환 */
const parseDescription = (desc: any): string | null => {
  if (!desc) return null;
  if (typeof desc === "string") {
    try {
      const parsed = JSON.parse(desc);
      if (typeof parsed === "string") return parsed;
      if (typeof parsed === "object" && parsed !== null)
        return parsed.summary || parsed.text || null;
      return desc;
    } catch {
      return desc;
    }
  }
  if (typeof desc === "object" && desc !== null)
    return desc.summary || desc.text || null;
  return String(desc);
};

type PanelType = "comments" | "info" | null;

const CreatorPage: React.FC = () => {
  // ── 피드 상태 ──
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [nextSeedId, setNextSeedId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [excludeIds, setExcludeIds] = useState<number[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // ── 현재 영상 상태 ──
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playInfo, setPlayInfo] = useState<UserContentPlayInfo | null>(null);
  const [playLoading, setPlayLoading] = useState(false);

  // ── 패널 / UI 상태 ──
  const [openPanel, setOpenPanel] = useState<PanelType>(null);
  const [bookmarked, setBookmarked] = useState<Set<number>>(new Set());

  // ── 댓글 상태 ──
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  // ── refs ──
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── 원본 콘텐츠 모달 ──
  const [selectedParentContent, setSelectedParentContent] =
    useState<Content | null>(null);

  const openParentModal = async (contentId: number) => {
    try {
      const content = await contentService.getContentById(String(contentId));
      setSelectedParentContent(content);
    } catch (e) {
      console.error("원본 콘텐츠 로드 실패:", e);
    }
  };

  const currentItem = feedItems[currentIndex];

  // ── 피드 로드 ──
  const loadFeed = useCallback(
    async (isInitial = false) => {
      if (feedLoading || (!isInitial && !hasMore)) return;
      setFeedLoading(true);
      try {
        const res = await creatorService.getFeed(
          isInitial ? null : nextSeedId,
          10,
          isInitial ? [] : excludeIds,
        );
        const newItems = res.items;
        setFeedItems((prev) => (isInitial ? newItems : [...prev, ...newItems]));
        setNextSeedId(res.nextSeedId);
        setHasMore(res.hasMore);
        setExcludeIds((prev) => [
          ...(isInitial ? [] : prev),
          ...newItems.map((i) => i.userContentId),
        ]);
      } catch (e) {
        console.error("피드 로드 실패:", e);
      } finally {
        setFeedLoading(false);
        if (isInitial) setInitialLoading(false);
      }
    },
    [feedLoading, hasMore, nextSeedId, excludeIds],
  );

  useEffect(() => {
    loadFeed(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 현재 영상 play 정보 로드 ──
  useEffect(() => {
    if (!currentItem) return;
    let cancelled = false;
    const load = async () => {
      setPlayLoading(true);
      setPlayInfo(null);
      try {
        const info = await creatorService.getPlayInfo(
          currentItem.userContentId,
        );
        if (!cancelled) setPlayInfo(info);
      } catch (e) {
        console.error("재생 정보 로드 실패:", e);
      } finally {
        if (!cancelled) setPlayLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [currentItem?.userContentId]);

  // ── 조회수 증가 (20초 후) ──
  useEffect(() => {
    if (!currentItem) return;
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    viewTimerRef.current = setTimeout(() => {
      creatorService
        .increaseViewCount(currentItem.userContentId)
        .catch(() => {});
    }, 20000);
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current);
    };
  }, [currentItem?.userContentId]);

  // ── 댓글 로드 ──
  const loadComments = useCallback(async () => {
    if (!playInfo?.videoId) return;
    setCommentLoading(true);
    try {
      const page = await creatorService.getComments(playInfo.videoId);
      setComments(page.content);
    } catch (e) {
      console.error("댓글 로드 실패:", e);
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  }, [playInfo?.videoId]);

  useEffect(() => {
    if (openPanel === "comments" && playInfo?.videoId) loadComments();
  }, [openPanel, playInfo?.videoId, loadComments]);

  // ── 스크롤 스냅 ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const idx = Math.round(container.scrollTop / container.clientHeight);
      if (idx !== currentIndex && idx >= 0 && idx < feedItems.length) {
        setCurrentIndex(idx);
        setOpenPanel(null);
      }
      if (idx >= feedItems.length - 3 && hasMore && !feedLoading) loadFeed();
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [currentIndex, feedItems.length, hasMore, feedLoading, loadFeed]);

  // ── 핸들러 ──
  const toggleBookmark = (id: number) => {
    setBookmarked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    alert("URL이 복사되었습니다.");
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !playInfo?.videoId) return;
    try {
      await creatorService.createComment(playInfo.videoId, commentText.trim());
      setCommentText("");
      loadComments();
    } catch (e) {
      console.error("댓글 작성 실패:", e);
    }
  };

  const togglePanel = (panel: PanelType) => {
    setOpenPanel((prev) => (prev === panel ? null : panel));
  };

  // ── 로딩 / 빈 상태 ──
  if (initialLoading) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (feedItems.length === 0) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-dark">
        <p className="text-gray-400">아직 크리에이터 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 top-16 flex justify-center bg-dark overflow-hidden">
        <div className="flex items-center gap-0 relative h-full">
          {/* 영상 영역 */}
          <div className="relative h-full" style={{ width: "480px" }}>
            <div
              ref={containerRef}
              className="h-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>
              {feedItems.map((item, idx) => (
                <div
                  key={item.userContentId}
                  className="h-full snap-start relative flex items-center justify-center flex-shrink-0 py-3"
                  style={{ minHeight: "100%" }}
                >
                  <div className="relative w-full h-full rounded-xl overflow-hidden bg-black">
                    {idx === currentIndex && playInfo?.url ? (
                      <div className="w-full h-full [&>div]:!h-full">
                        <VideoPlayer
                          videoUrl={playInfo.url}
                          autoPlay={true}
                          startTime={
                            playInfo.playbackState?.startPositionSec ?? 0
                          }
                          shortsMode={true}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-black flex items-center justify-center">
                        {idx === currentIndex && playLoading ? (
                          <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                        ) : item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-600 text-sm">
                            영상 준비 중...
                          </span>
                        )}
                      </div>
                    )}

                    {/* 하단 오버레이 */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                      {playInfo?.parentContent && idx === currentIndex && (
                        <button
                          onClick={() =>
                            openParentModal(playInfo.parentContent!.contentId)
                          }
                          className="pointer-events-auto flex items-center gap-2 mb-3 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors w-fit"
                        >
                          <Film className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs text-gray-200 truncate max-w-[200px]">
                            {playInfo.parentContent.title}
                          </span>
                        </button>
                      )}
                      {playInfo && idx === currentIndex && (
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                            <User className="w-5 h-5 text-gray-400" />
                          </div>
                          <span className="font-semibold text-sm">
                            @{playInfo.uploaderNickname}
                          </span>
                        </div>
                      )}
                      <p className="text-sm leading-snug line-clamp-2">
                        {item.title}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 사이드 액션 버튼 */}
          <div className="flex flex-col items-center justify-end gap-5 px-3 h-full pb-28">
            <button
              onClick={() => togglePanel("comments")}
              className={`flex flex-col items-center gap-1 transition-colors ${openPanel === "comments" ? "text-primary" : "text-white hover:text-gray-300"}`}
            >
              <div className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
                <MessageCircle className="w-6 h-6" />
              </div>
              <span className="text-xs">댓글</span>
            </button>
            <button
              onClick={() =>
                currentItem && toggleBookmark(currentItem.userContentId)
              }
              className="flex flex-col items-center gap-1 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
                <Bookmark
                  className={`w-6 h-6 ${currentItem && bookmarked.has(currentItem.userContentId) ? "fill-primary text-primary" : "text-white"}`}
                />
              </div>
              <span className="text-xs">
                {currentItem
                  ? formatCount(
                      currentItem.bookmarkCount +
                        (bookmarked.has(currentItem.userContentId) ? 1 : 0),
                    )
                  : "0"}
              </span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-1 text-white hover:text-gray-300 transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
                <Share2 className="w-6 h-6" />
              </div>
              <span className="text-xs">공유</span>
            </button>
            <button
              onClick={() => togglePanel("info")}
              className={`flex flex-col items-center gap-1 transition-colors ${openPanel === "info" ? "text-primary" : "text-white hover:text-gray-300"}`}
            >
              <div className="w-11 h-11 rounded-full bg-gray-800/80 flex items-center justify-center">
                <Info className="w-6 h-6" />
              </div>
              <span className="text-xs">정보</span>
            </button>
          </div>

          {/* 사이드 패널 */}
          <div
            className="bg-gray-900 border-l border-gray-800 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out"
            style={{
              width: openPanel ? "380px" : "0px",
              opacity: openPanel ? 1 : 0,
            }}
          >
            <div
              style={{ width: "380px", minWidth: "380px" }}
              className="h-full flex flex-col"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                <h3 className="font-semibold text-lg">
                  {openPanel === "comments"
                    ? `댓글 ${comments.length}`
                    : "영상 정보"}
                </h3>
                <button
                  onClick={() => setOpenPanel(null)}
                  className="p-1 hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {openPanel === "comments" ? (
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {commentLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                      </div>
                    ) : comments.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">
                        아직 댓글이 없습니다. 첫 댓글을 남겨보세요.
                      </p>
                    ) : (
                      comments.map((c) => (
                        <div key={c.commentId} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {c.profileImageUrl ? (
                              <img
                                src={c.profileImageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-gray-400">
                                {c.nickname.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-semibold">
                                @{c.nickname}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(c.createdAt)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                              {c.body}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="border-t border-gray-800 p-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleSubmitComment()
                      }
                      placeholder="댓글 추가..."
                      className="flex-1 bg-transparent border-b border-gray-700 focus:border-primary outline-none py-1.5 text-sm"
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={!commentText.trim()}
                      className="p-2 text-primary disabled:text-gray-600 transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : openPanel === "info" && playInfo ? (
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <h4 className="text-xl font-bold leading-snug">
                    {playInfo.title}
                  </h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <span className="font-semibold">
                      @{playInfo.uploaderNickname}
                    </span>
                  </div>
                  <div className="border-t border-gray-800" />
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">영상 길이</span>
                      <span className="ml-auto">
                        {formatDuration(playInfo.durationSec)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Eye className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">조회수</span>
                      <span className="ml-auto">
                        {playInfo.viewCount.toLocaleString()}회
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Bookmark className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">찜</span>
                      <span className="ml-auto">
                        {currentItem
                          ? currentItem.bookmarkCount.toLocaleString()
                          : 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-400">업로드</span>
                      <span className="ml-auto">
                        {formatDate(playInfo.createdAt)}
                      </span>
                    </div>
                  </div>
                  {playInfo.description &&
                    parseDescription(playInfo.description) && (
                      <>
                        <div className="border-t border-gray-800" />
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {parseDescription(playInfo.description)}
                        </p>
                      </>
                    )}
                  {playInfo.tags && playInfo.tags.length > 0 && (
                    <>
                      <div className="border-t border-gray-800" />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-400">태그</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {playInfo.tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 원본 콘텐츠 모달 (홈과 동일) */}
      {selectedParentContent && (
        <ContentModal
          content={selectedParentContent}
          onClose={() => setSelectedParentContent(null)}
        />
      )}
    </>
  );
};

export default CreatorPage;
