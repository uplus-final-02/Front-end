import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Bookmark,
  Clock,
  Eye,
  Calendar,
  Send,
  PlayCircle,
  MessageCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Content, Episode } from "@/types";
import { contentService } from "@/services/contentService";
import { videoService, type VideoPlayInfo } from "@/services/videoService";
import { historyService } from "@/services/historyService";
import { bookmarkService } from "@/services/bookmarkService";
import { commentService, type CommentDto } from "@/services/commentService";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayer from "@/components/common/VideoPlayer";
import ConfirmModal from "@/components/common/ConfirmModal";

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<Content | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [playInfo, setPlayInfo] = useState<VideoPlayInfo | null>(null);
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const theaterRef = useRef<HTMLDivElement>(null);
  const currentVideoIdRef = useRef<string | null>(null);
  const lastSaveTimeRef = useRef(0);
  const [isCommentPanelOpen, setIsCommentPanelOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [deleteTargetCommentId, setDeleteTargetCommentId] = useState<
    number | null
  >(null);

  const shouldAutoPlay = searchParams.get("autoplay") === "true";
  const episodeParam = searchParams.get("episode");

  // 전체화면 토글
  const handleToggleFullscreen = () => {
    const el = theaterRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  // 전체화면 상태 동기화
  useEffect(() => {
    const syncFullscreen = () => {
      const el = theaterRef.current;
      const fs =
        !!document.fullscreenElement && document.fullscreenElement === el;
      setIsFullscreen(fs);
      if (!fs) setIsCommentPanelOpen(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);
    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  // 콘텐츠 로드
  useEffect(() => {
    if (id) {
      // 콘텐츠 전환 시 상태 리셋
      setIsCommentPanelOpen(false);
      setPlayInfo(null);
      setPlayError(null);
      setCurrentEpisode(null);
      // 전체화면 중이면 해제 후 상태 리셋
      if (document.fullscreenElement) {
        document
          .exitFullscreen()
          .then(() => {
            setIsFullscreen(false);
          })
          .catch(() => {
            setIsFullscreen(false);
          });
      } else {
        setIsFullscreen(false);
      }
      loadContent();
    }
  }, [id]);

  // 페이지 이탈 시 마지막 위치 저장
  useEffect(() => {
    const saveOnLeave = () => {
      if (currentVideoIdRef.current && user) {
        const video = document.querySelector("video");
        if (video && video.currentTime > 0) {
          // sendBeacon으로 비동기 저장 (페이지 이탈에도 전송 보장)
          const data = JSON.stringify({
            positionSec: Math.floor(video.currentTime),
            playDurationSec: 0,
          });
          const baseUrl = import.meta.env.VITE_API_BASE_URL || "";
          navigator.sendBeacon(
            `${baseUrl}/api/histories/savepoint/${currentVideoIdRef.current}`,
            new Blob([data], { type: "application/json" }),
          );
        }
      }
    };

    window.addEventListener("beforeunload", saveOnLeave);
    return () => {
      saveOnLeave();
      window.removeEventListener("beforeunload", saveOnLeave);
    };
  }, [user]);

  // 콘텐츠 로드 후 재생 정보 가져오기
  useEffect(() => {
    if (!content) return;

    if (content.isSeries && content.episodes && content.episodes.length > 0) {
      // 시리즈: URL에 에피소드 지정이 있으면 해당 에피소드, 없으면 첫 에피소드
      const targetEp = episodeParam
        ? content.episodes.find((ep) => ep.id === episodeParam)
        : content.episodes[0];
      const ep = targetEp || content.episodes[0];
      setCurrentEpisode(ep);
      loadPlayInfo(ep.id);
    } else if (!content.isSeries) {
      // 단일 영상: episodes에서 videoId를 가져옴 (contentId ≠ videoId)
      if (content.episodes && content.episodes.length > 0) {
        loadPlayInfo(content.episodes[0].id);
      } else {
        // videoId를 알 수 없으면 콘텐츠 정보만 표시
        setPlayError("재생 가능한 영상 정보를 찾을 수 없습니다.");
      }
    }

    checkBookmark();
  }, [content]);

  const loadContent = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await contentService.getContentById(id);
      setContent(data);
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPlayInfo = async (videoId: string) => {
    if (!user) {
      setPlayError(null);
      setPlayInfo(null);
      return;
    }

    currentVideoIdRef.current = videoId;
    lastSaveTimeRef.current = 0;
    setPlayLoading(true);
    setPlayError(null);
    try {
      const info = await videoService.getPlayInfo(videoId);
      setPlayInfo(info);
      setIsBookmarked(info.isBookmarked);

      // 조회수 증가
      try {
        await videoService.increaseViewCount(videoId);
      } catch (e) {
        // 조회수 증가 실패는 무시
      }

      // 댓글 로드
      loadComments();

      if (!info.url) {
        setPlayError("현재 재생 가능한 영상이 없습니다.");
      }
    } catch (error: any) {
      console.error("재생 정보 조회 실패:", error);
      const status = error.response?.status;
      if (status === 403) {
        setPlayError("이 콘텐츠는 구독 회원만 시청할 수 있습니다.");
      } else if (status === 404) {
        setPlayError("영상 파일을 찾을 수 없습니다.");
      } else if (status === 409) {
        // 시청 이력 충돌 (soft-deleted 레코드 문제) - 재시도
        console.warn("409 Conflict - 시청 이력 충돌, 재시도 중...");
        try {
          const retryInfo = await videoService.getPlayInfo(videoId);
          setPlayInfo(retryInfo);
          setIsBookmarked(retryInfo.isBookmarked);
          try {
            await videoService.increaseViewCount(videoId);
          } catch {}
          loadComments();
          if (!retryInfo.url) {
            setPlayError("현재 재생 가능한 영상이 없습니다.");
          }
          return;
        } catch {
          setPlayError(
            "재생 정보를 불러오는 중 충돌이 발생했습니다. 잠시 후 다시 시도해주세요.",
          );
        }
      } else {
        setPlayError("재생 정보를 불러올 수 없습니다.");
      }
    } finally {
      setPlayLoading(false);
    }
  };

  const loadComments = async () => {
    if (!currentVideoIdRef.current) return;
    try {
      const data = await commentService.getComments(currentVideoIdRef.current);
      setComments(data.content);
    } catch (error) {
      console.error("댓글 로딩 실패:", error);
    }
  };

  const checkBookmark = async () => {
    if (!id || !user) return;
    try {
      const response = await bookmarkService.getBookmarks(undefined, 100);
      const bookmarked = response.bookmarks.some(
        (b) => b.contentId === parseInt(id),
      );
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("찜하기 확인 실패:", error);
    }
  };

  const handleToggleBookmark = async () => {
    if (!id || !user) {
      navigate("/login");
      return;
    }
    try {
      const contentId = parseInt(id);
      if (isBookmarked) {
        await bookmarkService.removeBookmark(contentId);
        setIsBookmarked(false);
      } else {
        await bookmarkService.addBookmark(contentId);
        setIsBookmarked(true);
      }
    } catch (error: any) {
      console.error("찜하기 실패:", error);
      alert(error.response?.data?.message || "찜하기에 실패했습니다.");
    }
  };

  const handleTimeUpdate = async (
    currentTime: number,
    playDurationSec: number,
  ) => {
    if (!user || !currentVideoIdRef.current) return;

    // 10초마다 savepoint API 호출
    const now = Math.floor(currentTime);
    if (now - lastSaveTimeRef.current >= 10) {
      lastSaveTimeRef.current = now;
      try {
        await historyService.savePoint(currentVideoIdRef.current, {
          positionSec: Math.floor(currentTime),
          playDurationSec: Math.floor(playDurationSec),
        });
      } catch (error) {
        // savepoint 실패는 무시 (재생에 영향 없음)
      }
    }
  };

  const handleEpisodeSelect = async (episode: Episode) => {
    // 에피소드 전환 전 현재 위치 저장
    if (currentVideoIdRef.current && user) {
      const video = document.querySelector("video");
      if (video) {
        try {
          await historyService.savePoint(currentVideoIdRef.current, {
            positionSec: Math.floor(video.currentTime),
            playDurationSec: 0,
          });
        } catch {}
      }
    }
    setCurrentEpisode(episode);
    setPlayInfo(null);
    loadPlayInfo(episode.id);
  };

  // 다음/이전 에피소드 이동 (play API context 활용)
  const handleNextEpisode = () => {
    if (!playInfo?.context?.nextVideoId || !content?.episodes) return;
    const nextEp = content.episodes.find(
      (ep) => ep.id === playInfo.context.nextVideoId!.toString(),
    );
    if (nextEp) handleEpisodeSelect(nextEp);
  };

  const handlePrevEpisode = () => {
    if (!playInfo?.context?.prevVideoId || !content?.episodes) return;
    const prevEp = content.episodes.find(
      (ep) => ep.id === playInfo.context.prevVideoId!.toString(),
    );
    if (prevEp) handleEpisodeSelect(prevEp);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentVideoIdRef.current || !user || !commentText.trim()) return;
    try {
      await commentService.createComment(
        currentVideoIdRef.current,
        commentText,
      );
      setCommentText("");
      // 댓글 목록 새로고침
      loadComments();
    } catch (error) {
      console.error("댓글 작성 실패:", error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!currentVideoIdRef.current || !user) return;
    try {
      await commentService.deleteComment(currentVideoIdRef.current, commentId);
      setDeleteTargetCommentId(null);
      loadComments();
    } catch (error) {
      console.error("댓글 삭제 실패:", error);
    }
  };

  const handleEditComment = (comment: CommentDto) => {
    setEditingCommentId(comment.commentId);
    setEditingCommentText(comment.body);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleSaveEdit = async (commentId: number) => {
    if (!currentVideoIdRef.current || !user || !editingCommentText.trim())
      return;
    try {
      await commentService.updateComment(
        currentVideoIdRef.current,
        commentId,
        editingCommentText,
      );
      setEditingCommentId(null);
      setEditingCommentText("");
      loadComments();
    } catch (error) {
      console.error("댓글 수정 실패:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}분 ${secs}초`;
  };

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

  if (!content) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl text-gray-400">콘텐츠를 찾을 수 없습니다.</p>
          <button onClick={() => navigate("/")} className="btn-primary mt-4">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 재생 URL 결정
  const videoUrl = playInfo?.url || null;
  const startPosition = playInfo?.playbackState?.startPositionSec || 0;

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div
          className={`grid grid-cols-1 ${content.isSeries ? "lg:grid-cols-3" : ""} gap-8`}
        >
          <div
            className={
              content.isSeries ? "lg:col-span-2" : "max-w-5xl mx-auto w-full"
            }
          >
            {/* 비디오 플레이어 영역 + 댓글 사이드 패널 */}
            <div
              key={id}
              className={`mb-6 flex overflow-hidden rounded-lg ${isFullscreen ? "bg-black h-screen" : ""}`}
              ref={theaterRef}
            >
              <div className="flex-1 min-w-0">
                {playLoading ? (
                  <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-400">재생 정보 로딩 중...</p>
                    </div>
                  </div>
                ) : !user ? (
                  <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-xl mb-4">로그인이 필요합니다.</p>
                      <button
                        onClick={() => navigate("/login")}
                        className="btn-primary"
                      >
                        로그인
                      </button>
                    </div>
                  </div>
                ) : playError ? (
                  <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-xl mb-4">{playError}</p>
                      {playError.includes("구독") && (
                        <button
                          onClick={() => navigate("/subscribe")}
                          className="btn-primary"
                        >
                          구독하기
                        </button>
                      )}
                    </div>
                  </div>
                ) : videoUrl ? (
                  <VideoPlayer
                    videoUrl={videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onToggleComments={() =>
                      setIsCommentPanelOpen((prev) => !prev)
                    }
                    onToggleFullscreen={handleToggleFullscreen}
                    isCommentOpen={isCommentPanelOpen}
                    isFullscreen={isFullscreen}
                    startTime={startPosition}
                    autoPlay={shouldAutoPlay}
                  />
                ) : (
                  <div className="aspect-video bg-gray-900 flex items-center justify-center rounded-lg">
                    <div className="text-center">
                      <AlertCircle className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                      <p className="text-gray-400">
                        재생 가능한 영상이 없습니다.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* 댓글 사이드 패널 (전체화면 + 댓글 열림일 때만) */}
              {isFullscreen && isCommentPanelOpen && (
                <div className="w-[400px] flex-shrink-0 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-gray-800 flex-shrink-0">
                    <h3 className="font-bold text-lg">
                      댓글 {comments.length}개
                    </h3>
                    <button
                      onClick={() => setIsCommentPanelOpen(false)}
                      className="text-gray-400 hover:text-white transition-colors text-xl leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                    {comments.length === 0 ? (
                      <p className="text-center text-gray-500 py-8 text-sm">
                        첫 댓글을 작성해보세요!
                      </p>
                    ) : (
                      comments.map((comment) => (
                        <div
                          key={comment.commentId}
                          className="border-b border-gray-800 pb-3"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {comment.profileImageUrl && (
                              <img
                                src={comment.profileImageUrl}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            )}
                            <span className="font-semibold text-sm">
                              {comment.nickname}
                            </span>
                            <span className="text-xs text-gray-500 ml-auto">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          {editingCommentId === comment.commentId ? (
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
                                      handleSaveEdit(comment.commentId);
                                    if (e.key === "Escape") handleCancelEdit();
                                  }}
                                  className="flex-1 bg-transparent border-b border-gray-700 focus:border-primary outline-none py-1 text-sm"
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() =>
                                    handleSaveEdit(comment.commentId)
                                  }
                                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-300 text-sm">
                              {comment.body}
                            </p>
                          )}
                          {user &&
                            user.id === comment.userId.toString() &&
                            editingCommentId !== comment.commentId && (
                              <div className="flex gap-2 mt-1">
                                <button
                                  onClick={() => handleEditComment(comment)}
                                  className="text-xs text-gray-500 hover:text-primary transition-colors"
                                >
                                  수정
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTargetCommentId(comment.commentId)
                                  }
                                  className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                >
                                  삭제
                                </button>
                              </div>
                            )}
                        </div>
                      ))
                    )}
                  </div>

                  {user && (
                    <form
                      onSubmit={handleCommentSubmit}
                      className="p-4 border-t border-gray-800 flex-shrink-0"
                    >
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentText}
                          onChange={(e) => setCommentText(e.target.value)}
                          placeholder="댓글 추가..."
                          className="flex-1 bg-transparent border-b border-gray-700 focus:border-primary outline-none py-2 text-sm"
                        />
                        <button
                          type="submit"
                          disabled={!commentText.trim()}
                          className="text-primary disabled:opacity-30 transition-opacity"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* 시리즈 에피소드 네비게이션 */}
            {content.isSeries && playInfo?.context && (
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handlePrevEpisode}
                  disabled={!playInfo.context.prevVideoId}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>이전 화</span>
                </button>
                {playInfo.context.episodeNumber && (
                  <span className="text-gray-400">
                    {playInfo.context.episodeNumber}화
                  </span>
                )}
                <button
                  onClick={handleNextEpisode}
                  disabled={!playInfo.context.nextVideoId}
                  className="flex items-center gap-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <span>다음 화</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 콘텐츠 정보 */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <h1 className="text-3xl font-bold">
                      {content.isSeries && currentEpisode
                        ? `${content.title} - ${currentEpisode.title}`
                        : content.title}
                    </h1>
                    {content.isOriginal && (
                      <span className="bg-primary px-3 py-1 rounded text-sm font-bold">
                        오리지널
                      </span>
                    )}
                    {content.isSeries && (
                      <span className="bg-blue-600 px-3 py-1 rounded text-sm font-bold">
                        시리즈
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-6 text-sm text-gray-400 mb-4">
                    <span className="flex items-center space-x-1">
                      <Eye className="w-4 h-4" />
                      <span>
                        {(
                          playInfo?.viewCount ??
                          content.viewCount ??
                          0
                        ).toLocaleString()}{" "}
                        조회
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDuration(
                          playInfo?.durationSec ??
                            (content.isSeries && currentEpisode
                              ? currentEpisode.duration
                              : typeof content.duration === "number"
                                ? content.duration
                                : 0),
                        )}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {formatDate(
                          playInfo?.createdAt || content.uploadDate || "",
                        )}
                      </span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleToggleBookmark}
                  className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${
                    isBookmarked
                      ? "bg-primary text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <Bookmark
                    className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`}
                  />
                  <span>{isBookmarked ? "찜 해제" : "찜하기"}</span>
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <p className="text-gray-300 leading-relaxed mb-4">
                  {playInfo?.description ||
                    (content.isSeries && currentEpisode
                      ? currentEpisode.description
                      : content.description)}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(playInfo?.tags || content.tags).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-800 text-sm text-gray-400">
                  업로더: {playInfo?.uploaderNickname || content.uploaderName}
                </div>
              </div>
            </div>

            {/* 댓글 */}
            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>댓글 {comments.length}개</span>
              </h2>
              {user ? (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="댓글을 입력하세요..."
                      className="flex-1 input-field"
                    />
                    <button
                      type="submit"
                      disabled={!commentText.trim()}
                      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-6 text-center py-4 bg-gray-800 rounded">
                  <p className="text-gray-400 mb-2">
                    댓글을 작성하려면 로그인이 필요합니다.
                  </p>
                  <button
                    onClick={() => navigate("/login")}
                    className="btn-primary text-sm"
                  >
                    로그인
                  </button>
                </div>
              )}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    첫 댓글을 작성해보세요!
                  </p>
                ) : (
                  comments.map((comment) => (
                    <div
                      key={comment.commentId}
                      className="border-b border-gray-800 pb-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {comment.profileImageUrl && (
                          <img
                            src={comment.profileImageUrl}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        )}
                        <span className="font-semibold">
                          {comment.nickname}
                        </span>
                        <span className="text-xs text-gray-500 ml-auto">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      {editingCommentId === comment.commentId ? (
                        <div className="mt-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editingCommentText}
                              onChange={(e) =>
                                setEditingCommentText(e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveEdit(comment.commentId);
                                if (e.key === "Escape") handleCancelEdit();
                              }}
                              className="flex-1 input-field"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => handleSaveEdit(comment.commentId)}
                              className="text-xs text-primary hover:text-primary/80 transition-colors"
                            >
                              저장
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-300">{comment.body}</p>
                      )}
                      {user &&
                        user.id === comment.userId.toString() &&
                        editingCommentId !== comment.commentId && (
                          <div className="flex gap-3 mt-2">
                            <button
                              onClick={() => handleEditComment(comment)}
                              className="text-xs text-gray-500 hover:text-primary transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() =>
                                setDeleteTargetCommentId(comment.commentId)
                              }
                              className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* 시리즈 에피소드 사이드바 */}
          {content.isSeries &&
            content.episodes &&
            content.episodes.length > 0 && (
              <div className="lg:col-span-1">
                <div className="bg-gray-900 rounded-lg p-6 sticky top-24">
                  <h2 className="text-xl font-bold mb-4">에피소드 목록</h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {content.episodes.map((episode) => (
                      <div
                        key={episode.id}
                        onClick={() => handleEpisodeSelect(episode)}
                        className={`cursor-pointer rounded-lg p-4 transition-all ${
                          currentEpisode?.id === episode.id
                            ? "bg-primary text-white"
                            : "bg-gray-800 hover:bg-gray-700"
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={
                                episode.thumbnailUrl ||
                                content.thumbnailUrl ||
                                content.thumbnail
                              }
                              alt={episode.title}
                              className="w-24 h-14 object-cover rounded"
                            />
                            {currentEpisode?.id === episode.id && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                                <PlayCircle className="w-6 h-6" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm mb-1 line-clamp-1">
                              {episode.episodeNumber}화. {episode.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-xs">
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatDuration(episode.duration)}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <Eye className="w-3 h-3" />
                                <span>
                                  {episode.viewCount.toLocaleString()}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {deleteTargetCommentId !== null && (
        <ConfirmModal
          message="댓글을 삭제하시겠습니까?"
          confirmText="삭제"
          cancelText="취소"
          onConfirm={() => handleDeleteComment(deleteTargetCommentId)}
          onCancel={() => setDeleteTargetCommentId(null)}
        />
      )}
    </div>
  );
};

export default ContentDetailPage;
