import React, { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  MessageCircle,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (currentTime: number, playDurationSec: number) => void;
  onToggleComments?: () => void;
  onToggleFullscreen?: () => void;
  onEnded?: () => void;
  isCommentOpen?: boolean;
  isFullscreen?: boolean;
  startTime?: number;
  autoPlay?: boolean;
  shortsMode?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  onTimeUpdate,
  onToggleComments,
  onToggleFullscreen,
  onEnded,
  isCommentOpen = false,
  isFullscreen = false,
  startTime = 0,
  autoPlay = false,
  shortsMode = false,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem("utopia_volume");
    return saved !== null ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem("utopia_muted") === "true";
  });
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"speed" | "quality">("speed");

  // HLS 인스턴스 & 화질 레벨
  const hlsRef = useRef<Hls | null>(null);
  const [qualityLevels, setQualityLevels] = useState<
    { index: number; height: number; bitrate: number }[]
  >([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = 자동

  // 누적 재생 시간 추적 (실제로 재생된 시간)
  const playDurationRef = useRef(0);
  const playingRef = useRef(false);

  // 구독 여부에 따른 제한
  const canUseSpeedControl = user?.subscriptionType !== "none";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // videoUrl 변경 시 누적 재생 시간 리셋
    playDurationRef.current = 0;

    if (Hls.isSupported()) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          xhr.withCredentials = true; // 쿠키 포함
        },
      });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        // 화질 레벨 수집
        const levels = data.levels.map((level, index) => ({
          index,
          height: level.height,
          bitrate: level.bitrate,
        }));
        setQualityLevels(levels);
        setCurrentQuality(-1); // 자동

        if (startTime > 0) {
          video.currentTime = startTime;
        }
        video.volume = volume;
        video.muted = isMuted;
        if (autoPlay) {
          video.play();
        }
      });

      return () => {
        hlsRef.current = null;
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
      if (startTime > 0) {
        video.currentTime = startTime;
      }
      video.volume = volume;
      video.muted = isMuted;
      if (autoPlay) {
        video.play();
      }
    }
  }, [videoUrl, startTime, autoPlay]);

  // 누적 재생 시간 계산을 위한 인터벌
  useEffect(() => {
    const interval = setInterval(() => {
      if (playingRef.current) {
        playDurationRef.current += 1;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime, playDurationRef.current);
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    playingRef.current = true;
  };

  const handlePause = () => {
    setIsPlaying(false);
    playingRef.current = false;
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const time = parseFloat(e.target.value);
    video.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const vol = parseFloat(e.target.value);
    video.volume = vol;
    video.muted = false;
    setVolume(vol);
    setIsMuted(vol === 0);
    localStorage.setItem("utopia_volume", String(vol));
    localStorage.setItem("utopia_muted", String(vol === 0));
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(!isMuted);
    localStorage.setItem("utopia_muted", String(!isMuted));
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video || !canUseSpeedControl) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const changeQuality = (levelIndex: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    hls.currentLevel = levelIndex; // -1 = 자동
    setCurrentQuality(levelIndex);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
    }
  };

  const skipTime = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.duration, video.currentTime + seconds),
    );
    setCurrentTime(video.currentTime);
  };

  useEffect(() => {
    if (shortsMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        skipTime(-10);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        skipTime(10);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortsMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={`relative bg-black group ${isFullscreen ? "h-full" : ""} ${shortsMode ? "h-full" : ""}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => !shortsMode && setShowControls(false)}
    >
      <video
        ref={videoRef}
        className={`w-full ${shortsMode ? "h-full object-contain" : isFullscreen ? "h-full object-contain" : "aspect-video"}`}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={onEnded}
        onClick={togglePlay}
      />

      {shortsMode ? (
        <ShortsControls
          isPlaying={isPlaying}
          togglePlay={togglePlay}
          toggleMute={toggleMute}
          isMuted={isMuted}
          volume={volume}
          setVolume={setVolume}
          setIsMuted={setIsMuted}
          currentTime={currentTime}
          setCurrentTime={setCurrentTime}
          duration={duration}
          videoRef={videoRef}
          showControls={showControls}
        />
      ) : (
        <>
          {/* 기본 모드: 하단 컨트롤 오버레이 */}
          <div
            className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* 진행 바 */}
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 mb-4 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={togglePlay}
                  className="hover:text-primary transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMute}
                    className="hover:text-primary transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                </div>

                <span className="text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>

                <button
                  onClick={() => skipTime(-10)}
                  className="hover:text-primary transition-colors"
                  title="10초 되감기 (←)"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => skipTime(10)}
                  className="hover:text-primary transition-colors"
                  title="10초 넘기기 (→)"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center space-x-4">
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="hover:text-primary transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg p-2 min-w-[160px]">
                      {/* 탭 */}
                      <div className="flex border-b border-gray-700 mb-2">
                        <button
                          onClick={() => setSettingsTab("quality")}
                          className={`flex-1 text-xs py-1.5 transition-colors ${settingsTab === "quality" ? "text-primary border-b border-primary" : "text-gray-400"}`}
                        >
                          화질
                        </button>
                        <button
                          onClick={() => setSettingsTab("speed")}
                          className={`flex-1 text-xs py-1.5 transition-colors ${settingsTab === "speed" ? "text-primary border-b border-primary" : "text-gray-400"} ${!canUseSpeedControl ? "opacity-50" : ""}`}
                          disabled={!canUseSpeedControl}
                        >
                          속도
                        </button>
                      </div>

                      {settingsTab === "quality" && (
                        <>
                          <button
                            onClick={() => changeQuality(-1)}
                            className={`block w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors ${currentQuality === -1 ? "text-primary" : ""}`}
                          >
                            자동
                          </button>
                          {qualityLevels
                            .slice()
                            .sort((a, b) => b.height - a.height)
                            .map((level) => (
                              <button
                                key={level.index}
                                onClick={() => changeQuality(level.index)}
                                className={`block w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors ${currentQuality === level.index ? "text-primary" : ""}`}
                              >
                                {level.height}p
                              </button>
                            ))}
                        </>
                      )}

                      {settingsTab === "speed" && canUseSpeedControl && (
                        <>
                          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                            <button
                              key={rate}
                              onClick={() => changePlaybackRate(rate)}
                              className={`block w-full text-left px-3 py-2 rounded text-sm hover:bg-gray-800 transition-colors ${playbackRate === rate ? "text-primary" : ""}`}
                            >
                              {rate}x
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {onToggleComments && isFullscreen && (
                  <button
                    onClick={onToggleComments}
                    className={`hover:text-primary transition-colors ${isCommentOpen ? "text-primary" : ""}`}
                    title="댓글"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </button>
                )}

                <button
                  onClick={toggleFullscreen}
                  className="hover:text-primary transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5" />
                  ) : (
                    <Maximize className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {!canUseSpeedControl && (
              <div className="mt-2 text-xs text-gray-400">
                배속 재생은 구독 회원만 이용 가능합니다
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ── 쇼츠 모드 컨트롤 (드래그 지원) ── */
interface ShortsControlsProps {
  isPlaying: boolean;
  togglePlay: () => void;
  toggleMute: () => void;
  isMuted: boolean;
  volume: number;
  setVolume: (v: number) => void;
  setIsMuted: (m: boolean) => void;
  currentTime: number;
  setCurrentTime: (t: number) => void;
  duration: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showControls: boolean;
}

const ShortsControls: React.FC<ShortsControlsProps> = ({
  isPlaying,
  togglePlay,
  toggleMute,
  isMuted,
  volume,
  setVolume,
  setIsMuted,
  currentTime,
  setCurrentTime,
  duration,
  videoRef,
  showControls,
}) => {
  const volBarRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const draggingVol = useRef(false);
  const draggingProgress = useRef(false);
  const [volHover, setVolHover] = useState(false);

  const applyVolume = useCallback(
    (clientX: number) => {
      const bar = volBarRef.current;
      const video = videoRef.current;
      if (!bar || !video) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      video.volume = ratio;
      video.muted = false;
      setVolume(ratio);
      setIsMuted(ratio === 0);
      localStorage.setItem("utopia_volume", String(ratio));
      localStorage.setItem("utopia_muted", String(ratio === 0));
    },
    [videoRef, setVolume, setIsMuted],
  );

  const applyProgress = useCallback(
    (clientX: number) => {
      const bar = progressBarRef.current;
      const video = videoRef.current;
      if (!bar || !video || !duration) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      video.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    },
    [videoRef, duration, setCurrentTime],
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (draggingVol.current) applyVolume(e.clientX);
      if (draggingProgress.current) applyProgress(e.clientX);
    };
    const onMouseUp = () => {
      draggingVol.current = false;
      draggingProgress.current = false;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [applyVolume, applyProgress]);

  const volValue = isMuted ? 0 : volume;

  return (
    <>
      {/* 상단 컨트롤 */}
      <div
        className={`absolute top-0 left-0 right-0 p-3 flex items-center transition-opacity ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="hover:text-primary transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-7 h-7" />
            ) : (
              <Play className="w-7 h-7" />
            )}
          </button>
          <div
            className="relative flex items-center"
            onMouseEnter={() => setVolHover(true)}
            onMouseLeave={() => !draggingVol.current && setVolHover(false)}
          >
            <button
              onClick={toggleMute}
              className="hover:text-primary transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-6 h-6" />
              ) : (
                <Volume2 className="w-6 h-6" />
              )}
            </button>
            <div
              className="flex items-center transition-all duration-200 overflow-visible"
              style={{
                width: volHover || draggingVol.current ? 96 : 0,
                opacity: volHover || draggingVol.current ? 1 : 0,
              }}
            >
              <div
                ref={volBarRef}
                className="relative w-20 h-1 ml-2 bg-white/30 rounded-full cursor-pointer"
                onMouseDown={(e) => {
                  draggingVol.current = true;
                  applyVolume(e.clientX);
                }}
              >
                <div
                  className="h-full bg-white rounded-full"
                  style={{ width: `${volValue * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md pointer-events-none"
                  style={{
                    left: `${volValue * 100}%`,
                    transform: `translate(-50%, -50%)`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 하단 진행바 */}
      <div
        ref={progressBarRef}
        className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 cursor-pointer group/bar"
        onMouseDown={(e) => {
          draggingProgress.current = true;
          applyProgress(e.clientX);
        }}
      >
        <div
          className="h-full bg-primary relative"
          style={{
            width: duration ? `${(currentTime / duration) * 100}%` : "0%",
          }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3 h-3 rounded-full bg-primary scale-0 group-hover/bar:scale-100 transition-transform" />
        </div>
      </div>
    </>
  );
};

export default VideoPlayer;
