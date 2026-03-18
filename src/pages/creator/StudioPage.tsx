import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Video,
  Image as ImageIcon,
  CheckCircle,
  Loader2,
  AlertCircle,
  Search,
  ArrowLeft,
  Plus,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { creatorService, FeedItem } from "@/services/creatorService";
import { searchService } from "@/services/searchService";
import type { Content } from "@/types";

type PageStep =
  | "dashboard"
  | "select-parent"
  | "form"
  | "uploading"
  | "done"
  | "error";

interface UploadProgress {
  step: string;
  percent: number;
}

const StudioPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // ── 원본 콘텐츠 검색/선택 상태 ──
  const [searchResults, setSearchResults] = useState<Content[]>([]);
  const [parentLoading, setParentLoading] = useState(false);
  const [selectedParent, setSelectedParent] = useState<{
    contentId: number;
    title: string;
    thumbnailUrl: string | null;
  } | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ── 내 콘텐츠 상태 ──
  const [myUploads, setMyUploads] = useState<FeedItem[]>([]);
  const [myUploadsLoading, setMyUploadsLoading] = useState(false);
  const [myUploadsError, setMyUploadsError] = useState(false);

  // ── 업로드 폼 상태 ──
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
  });
  const [pageStep, setPageStep] = useState<PageStep>("dashboard");
  const [progress, setProgress] = useState<UploadProgress>({
    step: "",
    percent: 0,
  });
  const [errorMsg, setErrorMsg] = useState("");
  const [autoPublished, setAutoPublished] = useState(false);

  // ── 내 콘텐츠 로드 ──
  const loadMyUploads = async () => {
    if (!user) return;
    const numericId = Number(user.id);
    if (isNaN(numericId)) return;
    setMyUploadsLoading(true);
    try {
      const data = await creatorService.getMyUploads(numericId);
      setMyUploads(data);
      setMyUploadsError(false);
    } catch (e) {
      console.error("내 콘텐츠 로드 실패:", e);
      setMyUploadsError(true);
    } finally {
      setMyUploadsLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadMyUploads();
  }, []);

  // 외부 클릭 시 자동완성 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── 로딩 / 미인증 처리 ──
  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  // ── 자동완성 (디바운스) ──
  const handleSearchInput = (value: string) => {
    setSearchKeyword(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await searchService.getSuggestions(value);
        setSuggestions(result);
        setShowSuggestions(result.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  // ── 검색 실행 ──
  const executeSearch = async (keyword?: string) => {
    const q = keyword ?? searchKeyword;
    if (!q.trim()) return;
    setShowSuggestions(false);
    setParentLoading(true);
    setHasSearched(true);
    try {
      const result = await searchService.search({ keyword: q, size: 30 });
      setSearchResults(result.contents);
    } catch (e) {
      console.error("검색 실패:", e);
      setSearchResults([]);
    } finally {
      setParentLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchKeyword(suggestion);
    setShowSuggestions(false);
    executeSearch(suggestion);
  };

  const handleSelectParent = (content: Content) => {
    setSelectedParent({
      contentId: Number(content.id),
      title: content.title,
      thumbnailUrl: content.thumbnailUrl || content.thumbnail || null,
    });
    setPageStep("form");
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0])
      setFormData({ ...formData, videoFile: e.target.files[0] });
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0])
      setFormData({ ...formData, thumbnailFile: e.target.files[0] });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoFile) {
      alert("비디오 파일을 선택해주세요.");
      return;
    }
    if (!formData.title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!selectedParent) {
      alert("원본 콘텐츠를 선택해주세요.");
      return;
    }

    setPageStep("uploading");
    setErrorMsg("");

    try {
      setProgress({ step: "업로드 준비 중...", percent: 10 });
      const draft = await creatorService.createDraft(selectedParent.contentId);

      setProgress({ step: "업로드 URL 발급 중...", percent: 20 });
      const presign = await creatorService.getPresignedUrl(
        draft.userContentId,
        formData.videoFile.name,
        formData.videoFile.type || "video/mp4",
      );

      setProgress({ step: "영상 업로드 중...", percent: 30 });
      await creatorService.uploadToS3(presign.putUrl, formData.videoFile);
      setProgress({ step: "영상 업로드 완료", percent: 70 });

      setProgress({ step: "트랜스코딩 요청 중...", percent: 80 });
      await creatorService.confirmUpload(
        draft.userContentId,
        presign.objectKey,
      );

      setProgress({ step: "메타데이터 저장 중...", percent: 85 });
      await creatorService.updateMetadata(
        draft.userContentId,
        formData.title.trim(),
        formData.description.trim() || null,
      );

      if (formData.thumbnailFile) {
        setProgress({ step: "썸네일 업로드 중...", percent: 90 });
        await creatorService.uploadThumbnail(
          draft.userContentId,
          formData.thumbnailFile,
        );
      }

      // 트랜스코딩 완료 대기 후 자동 공개
      setProgress({ step: "트랜스코딩 대기 중...", percent: 92 });
      const maxAttempts = 120;
      let published = false;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        try {
          await creatorService.updateMetadata(
            draft.userContentId,
            formData.title.trim(),
            formData.description.trim() || null,
            "PUBLIC",
          );
          published = true;
          break;
        } catch {
          const pct = Math.min(92 + Math.floor((i / maxAttempts) * 7), 99);
          setProgress({
            step: `트랜스코딩 처리 중... (${i + 1}회 확인)`,
            percent: pct,
          });
        }
      }

      if (published) {
        setProgress({ step: "완료!", percent: 100 });
        setAutoPublished(true);
      } else {
        setProgress({ step: "업로드 완료 (트랜스코딩 진행 중)", percent: 100 });
        setAutoPublished(false);
      }
      setPageStep("done");
    } catch (err: any) {
      console.error("업로드 실패:", err);
      setErrorMsg(
        err?.response?.data?.message ||
          err?.message ||
          "업로드 중 오류가 발생했습니다.",
      );
      setPageStep("error");
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      videoFile: null,
      thumbnailFile: null,
    });
    setSelectedParent(null);
    setSearchKeyword("");
    setSearchResults([]);
    setHasSearched(false);
    setPageStep("dashboard");
    setProgress({ step: "", percent: 0 });
    setErrorMsg("");
    setAutoPublished(false);
  };

  // ── 업로드 진행 화면 ──
  if (pageStep === "uploading") {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">업로드 중...</h2>
            <p className="text-gray-400 mb-6">{progress.step}</p>
            <div className="w-full bg-gray-800 rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">{progress.percent}%</p>
          </div>
        </div>
      </div>
    );
  }

  // ── 완료 화면 ──
  if (pageStep === "done") {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">업로드 완료</h2>
            <p className="text-gray-400 mb-8">
              {autoPublished
                ? "콘텐츠가 공개되었습니다. 크리에이터 피드에서 확인하세요."
                : "트랜스코딩이 진행 중입니다. 완료 후 자동으로 공개됩니다."}
            </p>
            <div className="flex gap-3 justify-center">
              <button onClick={resetForm} className="btn-primary">
                스튜디오로 돌아가기
              </button>
              <button
                onClick={() => navigate("/creator")}
                className="btn-secondary"
              >
                크리에이터 피드로
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── 에러 화면 ──
  if (pageStep === "error") {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto bg-gray-900 rounded-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-2">업로드 실패</h2>
            <p className="text-red-400 mb-8">{errorMsg}</p>
            <button onClick={resetForm} className="btn-primary">
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 대시보드 (첫 화면): 내 콘텐츠 + 업로드 버튼 ──
  if (pageStep === "dashboard") {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">스튜디오</h1>
                <p className="text-gray-400">나만의 콘텐츠를 관리하세요</p>
              </div>
              <button
                onClick={() => setPageStep("select-parent")}
                className="btn-primary flex items-center gap-2 px-5 py-2.5"
              >
                <Plus className="w-5 h-5" />
                콘텐츠 업로드
              </button>
            </div>

            {/* 내 콘텐츠 */}
            <h2 className="text-xl font-bold mb-4">내 콘텐츠</h2>
            {myUploadsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : myUploads.length === 0 ? (
              <div className="text-center py-20 text-gray-500 bg-gray-900 rounded-lg">
                <Video className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="mb-4">
                  {myUploadsError
                    ? "내 콘텐츠를 불러올 수 없습니다."
                    : "아직 업로드한 콘텐츠가 없습니다."}
                </p>
                <button
                  onClick={() => setPageStep("select-parent")}
                  className="btn-primary px-6 py-2"
                >
                  첫 영상 업로드하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {myUploads.map((item) => (
                  <div
                    key={item.userContentId}
                    className="bg-gray-900 rounded-lg overflow-hidden"
                  >
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        조회수 {(item.totalViewCount ?? 0).toLocaleString()}회
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 원본 콘텐츠 검색/선택 ──
  if (pageStep === "select-parent") {
    return (
      <div className="min-h-screen bg-dark">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <button
                onClick={() => setPageStep("dashboard")}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <ArrowLeft className="w-4 h-4" />
                스튜디오로 돌아가기
              </button>
              <h1 className="text-3xl font-bold mb-2">원본 콘텐츠 선택</h1>
              <p className="text-gray-400">
                2차 창작할 원본 콘텐츠를 검색하세요
              </p>
            </div>

            {/* 검색 바 */}
            <div className="relative mb-8" ref={suggestionsRef}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && executeSearch()}
                    placeholder="콘텐츠 제목을 검색하세요..."
                    className="w-full pl-12 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:border-primary focus:outline-none text-sm"
                  />
                </div>
                <button
                  onClick={() => executeSearch()}
                  className="btn-primary px-6"
                >
                  검색
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-16 mt-1 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden z-50">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestionClick(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-800 text-sm transition-colors flex items-center gap-2"
                    >
                      <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 검색 결과 */}
            {parentLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-16 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>원본 콘텐츠를 검색해서 선택하세요</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {searchResults.map((content) => (
                  <button
                    key={content.id}
                    onClick={() => handleSelectParent(content)}
                    className="group text-left bg-gray-900 rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                  >
                    <div className="aspect-video bg-gray-800 relative overflow-hidden">
                      {content.thumbnailUrl || content.thumbnail ? (
                        <img
                          src={content.thumbnailUrl || content.thumbnail}
                          alt={content.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium line-clamp-2 mb-1">
                        {content.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        조회수 {(content.viewCount ?? 0).toLocaleString()}회
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 업로드 폼 ──
  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <button
              onClick={() => setPageStep("select-parent")}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              원본 콘텐츠 다시 선택
            </button>
            <h1 className="text-3xl font-bold mb-2">영상 업로드</h1>
            <p className="text-gray-400">
              나만의 콘텐츠를 업로드하고 공유하세요
            </p>
          </div>

          {/* 선택된 원본 콘텐츠 */}
          {selectedParent && (
            <div className="bg-gray-800 rounded-lg p-4 mb-6 flex items-center gap-4">
              <div className="w-24 h-14 bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {selectedParent.thumbnailUrl ? (
                  <img
                    src={selectedParent.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-primary mb-1">원본 콘텐츠</p>
                <p className="text-sm font-medium truncate">
                  {selectedParent.title}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-900 rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="콘텐츠 제목을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="input-field resize-none"
                  placeholder="콘텐츠에 대한 설명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  비디오 파일 * (1-5분 권장)
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    {formData.videoFile ? (
                      <div>
                        <p className="text-primary">
                          {formData.videoFile.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {(formData.videoFile.size / 1024 / 1024).toFixed(1)}{" "}
                          MB
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-1">
                          클릭하여 비디오 업로드
                        </p>
                        <p className="text-xs text-gray-600">
                          MP4, MOV, AVI 등
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  썸네일 이미지 (선택)
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    {formData.thumbnailFile ? (
                      <p className="text-primary">
                        {formData.thumbnailFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-1">
                          클릭하여 썸네일 업로드
                        </p>
                        <p className="text-xs text-gray-600">
                          JPG, PNG (16:9 비율 권장)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">업로드 가이드</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 비디오 길이: 1-5분 권장</li>
                  <li>• 파일 크기: 최대 500MB</li>
                  <li>• 해상도: 최소 720p 권장</li>
                  <li>• 업로드 후 트랜스코딩이 완료되면 자동 게시됩니다</li>
                  <li>• 저작권을 침해하는 콘텐츠는 삭제될 수 있습니다</li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button type="submit" className="flex-1 btn-primary">
                  <Upload className="w-5 h-5 inline mr-2" />
                  업로드
                </button>
                <button
                  type="button"
                  onClick={() => setPageStep("dashboard")}
                  className="btn-secondary"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPage;
