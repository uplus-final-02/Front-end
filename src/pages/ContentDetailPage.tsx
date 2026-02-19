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
} from "lucide-react";
import { Content, Comment, Episode } from "@/types";
import { contentService } from "@/services/contentService";
import { useAuth } from "@/contexts/AuthContext";
import VideoPlayer from "@/components/VideoPlayer";

const ContentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<Content | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<Episode | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastPosition, setLastPosition] = useState(0);
  const [isTransitioningToFullscreen, setIsTransitioningToFullscreen] =
    useState(false);
  const videoPlayerRef = useRef<HTMLDivElement>(null);

  // URL 파라미터에서 autoplay와 fullscreen 확인
  const shouldAutoPlay = searchParams.get("autoplay") === "true";
  const shouldFullscreen = searchParams.get("fullscreen") === "true";

  useEffect(() => {
    if (shouldFullscreen) {
      setIsTransitioningToFullscreen(true);
    }
  }, [shouldFullscreen]);

  useEffect(() => {
    if (id) {
      loadContent();
      checkBookmark();
      loadWatchHistory();
    }
  }, [id, user]);

  useEffect(() => {
    if (content) {
      if (content.isSeries && content.episodes && content.episodes.length > 0) {
        setCurrentEpisode(content.episodes[0]);
      }
      loadComments();
    }
  }, [content]);

  useEffect(() => {
    if (currentEpisode) {
      loadComments();
    }
  }, [currentEpisode]);

  // 전체화면 자동 실행
  useEffect(() => {
    if (shouldFullscreen && videoPlayerRef.current && content && !loading) {
      const timer = setTimeout(() => {
        const videoElement = videoPlayerRef.current?.querySelector("video");
        if (videoElement) {
          // 비디오가 로드될 때까지 대기
          const attemptFullscreen = () => {
            if (videoElement.readyState >= 2) {
              videoElement
                .requestFullscreen()
                .then(() => {
                  setIsTransitioningToFullscreen(false);
                })
                .catch((err) => {
                  console.error("전체화면 실패:", err);
                  setIsTransitioningToFullscreen(false);
                });
            } else {
              videoElement.addEventListener(
                "loadeddata",
                () => {
                  videoElement
                    .requestFullscreen()
                    .then(() => {
                      setIsTransitioningToFullscreen(false);
                    })
                    .catch((err) => {
                      console.error("전체화면 실패:", err);
                      setIsTransitioningToFullscreen(false);
                    });
                },
                { once: true },
              );
            }
          };

          attemptFullscreen();

          // 전체화면 종료 감지
          const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
              setIsTransitioningToFullscreen(false);
            }
          };

          document.addEventListener("fullscreenchange", handleFullscreenChange);

          return () => {
            document.removeEventListener(
              "fullscreenchange",
              handleFullscreenChange,
            );
          };
        } else {
          setIsTransitioningToFullscreen(false);
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [shouldFullscreen, content, loading]);

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
      const bookmarked = await contentService.isBookmarked(user.id, id);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("찜하기 확인 실패:", error);
    }
  };

  const loadWatchHistory = async () => {
    if (!id || !user) return;
    try {
      const history = await contentService.getWatchHistory(user.id);
      const currentHistory = history.find((h) => h.contentId === id);
      if (currentHistory) {
        setLastPosition(currentHistory.lastPosition);
      }
    } catch (error) {
      console.error("시청 이력 로딩 실패:", error);
    }
  };

  const handleToggleBookmark = async () => {
    if (!id || !user) {
      navigate("/login");
      return;
    }
    try {
      const bookmarked = await contentService.toggleBookmark(user.id, id);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("찜하기 실패:", error);
    }
  };

  const handleTimeUpdate = async (currentTime: number) => {
    if (!id || !user) return;
    if (Math.floor(currentTime) % 10 === 0) {
      try {
        await contentService.saveWatchHistory(user.id, id, currentTime);
      } catch (error) {
        console.error("시청 이력 저장 실패:", error);
      }
    }
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

  const handleEpisodeSelect = (episode: Episode) => {
    setCurrentEpisode(episode);
    setLastPosition(0);
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

  const canWatch = user?.subscriptionType !== "none" || !content.isOriginal;
  const currentVideoUrl =
    content.isSeries && currentEpisode
      ? currentEpisode.videoUrl
      : content.videoUrl;

  // 전체화면 전환 중이면 비디오 플레이어만 숨김 처리로 렌더링
  if (isTransitioningToFullscreen) {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-6" ref={videoPlayerRef}>
                {canWatch && (
                  <VideoPlayer
                    videoUrl={currentVideoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    startTime={lastPosition}
                    autoPlay={shouldAutoPlay}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        {/* 전체화면 전환 오버레이 */}
        <div className="fixed inset-0 bg-black z-40 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">전체화면으로 전환 중...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="mb-6" ref={videoPlayerRef}>
              {canWatch ? (
                <VideoPlayer
                  videoUrl={currentVideoUrl}
                  onTimeUpdate={handleTimeUpdate}
                  startTime={lastPosition}
                  autoPlay={shouldAutoPlay}
                />
              ) : (
                <div className="aspect-video bg-gray-900 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-xl mb-4">
                      이 콘텐츠는 구독 회원만 시청할 수 있습니다.
                    </p>
                    <button
                      onClick={() => navigate("/subscribe")}
                      className="btn-primary"
                    >
                      구독하기
                    </button>
                  </div>
                </div>
              )}
            </div>

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
                        {(content.isSeries && currentEpisode
                          ? currentEpisode.viewCount
                          : content.viewCount
                        ).toLocaleString()}{" "}
                        조회
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>
                        {formatDuration(
                          content.isSeries && currentEpisode
                            ? currentEpisode.duration
                            : content.duration,
                        )}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(content.uploadDate)}</span>
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleToggleBookmark}
                  className={`flex items-center space-x-2 px-4 py-2 rounded transition-colors ${isBookmarked ? "bg-primary text-white" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                >
                  <Bookmark
                    className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`}
                  />
                  <span>{isBookmarked ? "찜 해제" : "찜하기"}</span>
                </button>
              </div>
              <div className="bg-gray-900 rounded-lg p-6 mb-6">
                <p className="text-gray-300 leading-relaxed mb-4">
                  {content.isSeries && currentEpisode
                    ? currentEpisode.description
                    : content.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {content.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="bg-gray-800 px-3 py-1 rounded-full text-sm text-gray-300"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="pt-4 border-t border-gray-800 text-sm text-gray-400">
                  업로더: {content.uploaderName}
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center space-x-2">
                <MessageCircle className="w-5 h-5" />
                <span>
                  댓글 {comments.length}개
                  {content.isSeries && currentEpisode && (
                    <span className="text-sm text-gray-400 ml-2">
                      ({currentEpisode.title})
                    </span>
                  )}
                </span>
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
                        className={`cursor-pointer rounded-lg p-4 transition-all ${currentEpisode?.id === episode.id ? "bg-primary text-white" : "bg-gray-800 hover:bg-gray-700"}`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={episode.thumbnailUrl}
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
                              {episode.title}
                            </h3>
                            <p
                              className={`text-xs mb-2 line-clamp-2 ${currentEpisode?.id === episode.id ? "text-white/80" : "text-gray-400"}`}
                            >
                              {episode.description}
                            </p>
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
