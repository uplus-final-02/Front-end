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
import { Content, Comment, Episode } from "@/types";
import { contentService } from "@/services/contentService";
import { videoService, type VideoPlayInfo } from "@/services/videoService";
import { bookmarkService } from "@/services/bookmarkService";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayer from "@/components/common/VideoPlayer";

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<Content | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [playInfo, setPlayInfo] = useState<VideoPlayInfo | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [playLoading, setPlayLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  const shouldAutoPlay = searchParams.get("autoplay") === "true";
  const episodeParam = searchParams.get("episode");

  // 콘텐츠 로드
  useEffect(() => {
    if (id) {
      loadContent();
    }
  }, [id]);

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

    loadComments();
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
      } else {
        setPlayError("재생 정보를 불러올 수 없습니다.");
      }
    } finally {
      setPlayLoading(false);
    }
  };

  const loadComments = async () => {
    if (!id) return;
    try {
      const episodeId =
        content?.isSeries && currentEpisode ? currentEpisode.id : undefined;
      const data = await contentService.getComments(id, episodeId);
      setComments(data);
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

  const handleTimeUpdate = async (currentTime: number) => {
    // 10초마다 시청 이력 저장
    if (!id || !user) return;
    if (Math.floor(currentTime) % 10 === 0) {
      try {
        await contentService.saveWatchHistory(user.id, id, currentTime);
      } catch (error) {
        // 무시
      }
    }
  };

  const handleEpisodeSelect = (episode: Episode) => {
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
    if (!id || !user || !commentText.trim()) return;
    try {
      const episodeId =
        content?.isSeries && currentEpisode ? currentEpisode.id : undefined;
      const newComment = await contentService.addComment(
        id,
        user.id,
        user.nickname,
        commentText,
        episodeId,
      );
      setComments([newComment, ...comments]);
      setCommentText("");
    } catch (error) {
      console.error("댓글 작성 실패:", error);
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
            {/* 비디오 플레이어 영역 */}
            <div className="mb-6" ref={videoPlayerRef}>
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
                      key={comment.id}
                      className="border-b border-gray-800 pb-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">
                          {comment.userName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
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
    </div>
  );
};

export default ContentDetailPage;
