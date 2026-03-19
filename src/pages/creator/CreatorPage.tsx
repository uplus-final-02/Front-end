import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Share2,
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
import { useAuth } from "@/contexts/AuthContext";
import ConfirmModal from "@/components/common/ConfirmModal";
import { contentService } from "@/services/contentService";
import {
  creatorService,
  FeedItem,
  UserContentPlayInfo,
  Comment,
} from "@/services/creatorService";
import { commentService } from "@/services/commentService";
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
  const { videoId: paramVideoId } = useParams<{ videoId?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  // ── 댓글 상태 ──
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteTargetCommentId, setDeleteTargetCommentId] = useState<
    number | null
  >(null);

  // ── refs ──
  const viewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // paramVideoId로 직접 진입 시 피드에 없는 영상을 위한 별도 상태
  const [directPlayInfo, setDirectPlayInfo] =
    useState<UserContentPlayInfo | null>(null);
  const [directLoading, setDirectLoading] = useState(false);

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

  // ── URL 파라미터로 진입 시 해당 영상으로 이동 ──
  useEffect(() => {
    if (!paramVideoId) return;
    const targetId = Number(paramVideoId);
    if (isNaN(targetId)) return;

    // 피드에 있으면 해당 위치로 이동
    if (feedItems.length > 0) {
      const idx = feedItems.findIndex(
        (item) => item.userContentId === targetId,
      );
      if (idx >= 0) {
        if (idx !== currentIndex) {
          setCurrentIndex(idx);
          const container = containerRef.current;
          if (container) {
            container.scrollTo({
              top: idx * container.clientHeight,
              behavior: "instant",
            });
          }
        }
        setDirectPlayInfo(null); // 피드에서 찾았으니 direct 모드 해제
        return;
      }
    }

    // 피드에 없으면 직접 재생정보 로드 (피드에 삽입하지 않음)
    if (!directPlayInfo && !directLoading) {
      setDirectLoading(true);
      creatorService
        .getPlayInfo(targetId)
        .then((info) => {
          setDirectPlayInfo(info);
        })
        .catch((e) => {
          console.error("직접 재생정보 로드 실패:", e);
        })
        .finally(() => setDirectLoading(false));
    }
  }, [paramVideoId, feedItems.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 현재 영상 변경 시 URL 업데이트 ──
  useEffect(() => {
    if (!currentItem) return;
    const newPath = `/creator/${currentItem.userContentId}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState(null, "", newPath);
    }
  }, [currentItem?.userContentId]);

  // ── 현재 영상 play 정보 로드 ──
  const playRequestIdRef = useRef(0);
  useEffect(() => {
    // directPlayInfo 모드일 때는 피드 기반 재생 안 함
    if (!currentItem || directPlayInfo || directLoading) return;
    const requestId = ++playRequestIdRef.current;
    const targetContentId = currentItem.userContentId;
    const load = async () => {
      setPlayLoading(true);
      setPlayInfo(null);
      try {
        const info = await creatorService.getPlayInfo(targetContentId);
        console.log("[크리에이터 재생정보]", {
          userContentId: targetContentId,
          url: info.url,
          status: info.status,
          info,
        });
        // 응답이 돌아왔을 때 여전히 최신 요청인지 확인
        if (requestId === playRequestIdRef.current) {
          setPlayInfo(info);
        }
      } catch (e) {
        console.error("재생 정보 로드 실패:", e);
      } finally {
        if (requestId === playRequestIdRef.current) {
          setPlayLoading(false);
        }
      }
    };
    load();
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

  // 현재 활성 재생정보 (피드 모드 또는 direct 모드)
  const activePlayInfo = directPlayInfo || playInfo;

  // 영상이 바뀌면 댓글 초기화
  useEffect(() => {
    setComments([]);
    setOpenPanel(null);
  }, [activePlayInfo?.videoId]);

  // ── 댓글 로드 ──
  const loadComments = useCallback(async () => {
    if (!activePlayInfo?.videoId) return;
    setCommentLoading(true);
    try {
      const page = await creatorService.getComments(activePlayInfo.videoId);
      setComments(page.content);
    } catch (e) {
      console.error("댓글 로드 실패:", e);
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  }, [activePlayInfo?.videoId]);

  useEffect(() => {
    if (openPanel === "comments" && activePlayInfo?.videoId) loadComments();
  }, [openPanel, activePlayInfo?.videoId, loadComments]);

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
  const handleShare = () => {
    const url = currentItem
      ? `${window.location.origin}/creator/${currentItem.userContentId}`
      : window.location.href;
    navigator.clipboard.writeText(url);
    alert("URL이 복사되었습니다.");
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !activePlayInfo?.videoId) return;
    try {
      await creatorService.createComment(
        activePlayInfo.videoId,
        commentText.trim(),
      );
      setCommentText("");
      loadComments();
    } catch (e) {
      console.error("댓글 작성 실패:", e);
    }
  };

  const handleEditComment = (c: Comment) => {
    setEditingCommentId(c.commentId);
    setEditingCommentText(c.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!activePlayInfo?.videoId || !editingCommentText.trim()) return;
    try {
      await commentService.updateComment(
        activePlayInfo.videoId,
        commentId,
        editingCommentText.trim(),
      );
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    } catch (e) {
      console.error("댓글 수정 실패:", e);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!activePlayInfo?.videoId) return;
    try {
      await creatorService.deleteComment(activePlayInfo.videoId, commentId);
      loadComments();
    } catch (e) {
      console.error("댓글 삭제 실패:", e);
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
  if (feedItems.length === 0 && !directPlayInfo && !directLoading) {
    if (!user) {
      return (
        <div className="fixed inset-0 top-16 flex items-center justify-center bg-dark">
          <div className="text-center">
            <p className="text-gray-400 mb-4">
              크리에이터 콘텐츠를 보려면 로그인이 필요합니다.
            </p>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              로그인
            </button>
          </div>
        </div>
      );
    }
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-dark">
        <p className="text-gray-400">아직 크리에이터 콘텐츠가 없습니다.</p>
      </div>
    );
  }

  // ── 피드에 없는 영상 직접 재생 모드 ──
  if (directPlayInfo) {
    return (
      <>
        <div className="fixed inset-0 top-16 flex justify-center bg-dark overflow-hidden">
          <div className="flex items-center gap-0 relative h-full">
            <div className="relative h-full" style={{ width: "480px" }}>
              <div className="h-full flex items-center justify-center py-3">
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-black">
                  {directPlayInfo.url ? (
                    <div className="w-full h-full [&>div]:!h-full">
                      <VideoPlayer
                        videoUrl={directPlayInfo.url}
                        autoPlay={true}
                        startTime={
                          directPlayInfo.playbackState?.startPositionSec ?? 0
                        }
                        shortsMode={true}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full bg-black flex items-center justify-center">
                      <span className="text-gray-600 text-sm">
                        영상을 재생할 수 없습니다.
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                    {directPlayInfo.parentContent && (
                      <button
                        onClick={() =>
                          openParentModal(
                            directPlayInfo.parentContent!.contentId,
                          )
                        }
                        className="pointer-events-auto flex items-center gap-2 mb-3 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full hover:bg-white/20 transition-colors w-fit"
                      >
                        <Film className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        <span className="text-xs text-gray-200 truncate max-w-[200px]">
                          {directPlayInfo.parentContent.title}
                        </span>
                      </button>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden flex-shrink-0">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="font-semibold text-sm">
                        @{directPlayInfo.uploaderNickname}
                      </span>
                    </div>
                    <p className="text-sm leading-snug line-clamp-2">
                      {directPlayInfo.title}
                    </p>
                  </div>
                </div>
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
                              {editingCommentId === c.commentId ? (
                                <div className="mt-1">
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingCommentText}
                                      onChange={(e) =>
                                        setEditingCommentText(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          handleSaveEdit(c.commentId);
                                        if (e.key === "Escape")
                                          handleCancelEdit();
                                      }}
                                      className="flex-1 bg-transparent border-b border-gray-700 focus:border-primary outline-none py-1 text-sm"
                                      autoFocus
                                    />
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <button
                                      onClick={() =>
                                        handleSaveEdit(c.commentId)
                                      }
                                      className="text-xs text-primary hover:text-primary/80"
                                    >
                                      저장
                                    </button>
                                    <button
                                      onClick={handleCancelEdit}
                                      className="text-xs text-gray-500 hover:text-gray-300"
                                    >
                                      취소
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-300 leading-relaxed">
                                    {c.body}
                                  </p>
                                  {user &&
                                    String(user.id) === String(c.userId) && (
                                      <div className="flex gap-2 mt-1">
                                        <button
                                          onClick={() => handleEditComment(c)}
                                          className="text-xs text-gray-500 hover:text-primary transition-colors"
                                        >
                                          수정
                                        </button>
                                        <button
                                          onClick={() =>
                                            setDeleteTargetCommentId(
                                              c.commentId,
                                            )
                                          }
                                          className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                          삭제
                                        </button>
                                      </div>
                                    )}
                                </>
                              )}
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
                ) : openPanel === "info" ? (
                  <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    <h4 className="text-xl font-bold leading-snug">
                      {directPlayInfo.title}
                    </h4>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="font-semibold">
                        @{directPlayInfo.uploaderNickname}
                      </span>
                    </div>
                    <div className="border-t border-gray-800" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">영상 길이</span>
                        <span className="ml-auto">
                          {formatDuration(directPlayInfo.durationSec)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Eye className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">조회수</span>
                        <span className="ml-auto">
                          {directPlayInfo.viewCount.toLocaleString()}회
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="text-gray-400">업로드</span>
                        <span className="ml-auto">
                          {formatDate(directPlayInfo.createdAt)}
                        </span>
                      </div>
                    </div>
                    {directPlayInfo.description &&
                      parseDescription(directPlayInfo.description) && (
                        <>
                          <div className="border-t border-gray-800" />
                          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {parseDescription(directPlayInfo.description)}
                          </p>
                        </>
                      )}
                    {directPlayInfo.tags && directPlayInfo.tags.length > 0 && (
                      <>
                        <div className="border-t border-gray-800" />
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-400">태그</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {directPlayInfo.tags.map((tag) => (
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

        {/* 원본 콘텐츠 모달 */}
        {selectedParentContent && (
          <ContentModal
            content={selectedParentContent}
            onClose={() => setSelectedParentContent(null)}
          />
        )}

        {/* 댓글 삭제 확인 모달 */}
        {deleteTargetCommentId !== null && (
          <ConfirmModal
            message="댓글을 삭제하시겠습니까?"
            confirmText="삭제"
            cancelText="취소"
            onConfirm={() => {
              handleDeleteComment(deleteTargetCommentId);
              setDeleteTargetCommentId(null);
            }}
            onCancel={() => setDeleteTargetCommentId(null)}
          />
        )}
      </>
    );
  }

  if (directLoading) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center bg-dark">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
                            {editingCommentId === c.commentId ? (
                              <div className="mt-1">
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={editingCommentText}
                                    onChange={(e) =>
                                      setEditingCommentText(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSaveEdit(c.commentId);
                                      if (e.key === "Escape")
                                        handleCancelEdit();
                                    }}
                                    className="flex-1 bg-transparent border-b border-gray-700 focus:border-primary outline-none py-1 text-sm"
                                    autoFocus
                                  />
                                </div>
                                <div className="flex gap-2 mt-1">
                                  <button
                                    onClick={() => handleSaveEdit(c.commentId)}
                                    className="text-xs text-primary hover:text-primary/80"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="text-xs text-gray-500 hover:text-gray-300"
                                  >
                                    취소
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm text-gray-300 leading-relaxed">
                                  {c.body}
                                </p>
                                {user &&
                                  String(user.id) === String(c.userId) && (
                                    <div className="flex gap-2 mt-1">
                                      <button
                                        onClick={() => handleEditComment(c)}
                                        className="text-xs text-gray-500 hover:text-primary transition-colors"
                                      >
                                        수정
                                      </button>
                                      <button
                                        onClick={() =>
                                          setDeleteTargetCommentId(c.commentId)
                                        }
                                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  )}
                              </>
                            )}
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

      {/* 댓글 삭제 확인 모달 */}
      {deleteTargetCommentId !== null && (
        <ConfirmModal
          message="댓글을 삭제하시겠습니까?"
          confirmText="삭제"
          cancelText="취소"
          onConfirm={() => {
            handleDeleteComment(deleteTargetCommentId);
            setDeleteTargetCommentId(null);
          }}
          onCancel={() => setDeleteTargetCommentId(null)}
        />
      )}
    </>
  );
};

export default CreatorPage;
