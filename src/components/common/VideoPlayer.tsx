import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface VideoPlayerProps {
  videoUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  startTime?: number;
  autoPlay?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoUrl,
  onTimeUpdate,
  startTime = 0,
  autoPlay = false,
}) => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // 구독 여부에 따른 제한
  const canUseSpeedControl = user?.subscriptionType !== "none";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (startTime > 0) {
          video.currentTime = startTime;
        }
        if (autoPlay) {
          video.play();
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoUrl;
      if (startTime > 0) {
        video.currentTime = startTime;
      }
      if (autoPlay) {
        video.play();
      }
    }
  }, [videoUrl, startTime, autoPlay]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    setCurrentTime(video.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
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
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(!isMuted);
  };

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current;
    if (!video || !canUseSpeedControl) return;

    video.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="relative bg-black group"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        className="w-full aspect-video"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onClick={togglePlay}
      />

      {/* 컨트롤 오버레이 */}
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
            {/* 재생/일시정지 */}
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

            {/* 볼륨 */}
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

            {/* 시간 */}
            <span className="text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* 배속 설정 */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`hover:text-primary transition-colors ${
                  !canUseSpeedControl ? "opacity-50 cursor-not-allowed" : ""
                }`}
                disabled={!canUseSpeedControl}
              >
                <Settings className="w-5 h-5" />
              </button>

              {showSettings && canUseSpeedControl && (
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg p-2 min-w-[120px]">
                  <div className="text-xs text-gray-400 mb-2">재생 속도</div>
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => changePlaybackRate(rate)}
                      className={`block w-full text-left px-3 py-2 rounded hover:bg-gray-800 transition-colors ${
                        playbackRate === rate ? "text-primary" : ""
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 전체화면 */}
            <button
              onClick={toggleFullscreen}
              className="hover:text-primary transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 구독 안내 */}
        {!canUseSpeedControl && (
          <div className="mt-2 text-xs text-gray-400">
            배속 재생은 구독 회원만 이용 가능합니다
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
