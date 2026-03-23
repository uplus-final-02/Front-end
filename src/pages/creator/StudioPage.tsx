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
  Play,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { creatorService, FeedItem } from "@/services/creatorService";
import { searchService } from "@/services/searchService";
import {
  subscribeUserTranscode,
  type SSESubscription,
  type TranscodeResultEvent,
} from "@/services/sseService";
import type { Content } from "@/types";
import AlertModal from "@/components/common/AlertModal";
import { getErrorMessage } from "@/utils/errorUtils";

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

  // ── 수정/삭제 상태 ──
  const [editTarget, setEditTarget] = useState<FeedItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editThumbnailFile, setEditThumbnailFile] = useState<File | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FeedItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  const sseRef = useRef<SSESubscription | null>(null);
  const [alertModal, setAlertModal] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // SSE 정리
  useEffect(() => {
    return () => {
      sseRef.current?.close();
    };
  }, []);

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

  useEffect(() => {
    if (!loading && user) {
      loadMyUploads();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

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
    if (!formData.title.trim()) {
      setAlertModal({ message: "제목을 입력해주세요.", type: "info" });
      return;
    }
    if (!formData.videoFile) {
      setAlertModal({ message: "비디오 파일을 선택해주세요.", type: "info" });
      return;
    }
    if (!selectedParent) {
      setAlertModal({ message: "원본 콘텐츠를 선택해주세요.", type: "info" });
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

      let thumbnailUrl = "";
      if (formData.thumbnailFile) {
        setProgress({ step: "썸네일 업로드 중...", percent: 83 });
        const thumbResult = await creatorService.uploadThumbnail(
          draft.userContentId,
          formData.thumbnailFile,
        );
        thumbnailUrl = thumbResult.thumbnailUrl || "";
      }

      setProgress({ step: "메타데이터 저장 중...", percent: 88 });
      await creatorService.updateMetadata(
        draft.userContentId,
        formData.title.trim(),
        formData.description.trim() || null,
        thumbnailUrl,
        "HIDDEN",
      );

      // SSE로 트랜스코딩 결과 대기
      setProgress({ step: "트랜스코딩 처리 중...", percent: 92 });

      sseRef.current?.close();
      sseRef.current = subscribeUserTranscode(
        draft.userContentId,
        async (event: TranscodeResultEvent) => {
          sseRef.current?.close();
          if (event.transcodeStatus === "DONE") {
            // 트랜스코딩 완료 → 공개 요청
            try {
              await creatorService.updateMetadata(
                draft.userContentId,
                formData.title.trim(),
                formData.description.trim() || null,
                thumbnailUrl,
                "ACTIVE",
                "PUBLIC",
              );
              setProgress({ step: "완료!", percent: 100 });
              setAutoPublished(true);
            } catch {
              setProgress({
                step: "업로드 완료 (공개 전환 실패)",
                percent: 100,
              });
              setAutoPublished(false);
            }
            setPageStep("done");
          } else {
            // FAILED
            setErrorMsg(event.reason || "트랜스코딩에 실패했습니다.");
            setPageStep("error");
          }
        },
        () => {
          // SSE 연결 실패 시 폴백: 수동 확인 안내
          setProgress({
            step: "업로드 완료 (트랜스코딩 진행 중)",
            percent: 100,
          });
          setAutoPublished(false);
          setPageStep("done");
        },
      );
    } catch (err: any) {
      console.error("업로드 실패:", err);
      setErrorMsg(getErrorMessage(err, "업로드 중 오류가 발생했습니다."));
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
    loadMyUploads();
  };

  // ── 수정 ──
  const handleOpenEdit = (item: FeedItem) => {
    setEditTarget(item);
    setEditTitle(item.title);
    setEditDescription("");
    setEditThumbnailFile(null);
  };

  const handleEditSave = async () => {
    if (!editTarget || !editTitle.trim()) return;
    setEditSaving(true);
    try {
      let thumbnailUrl = editTarget.thumbnailUrl || "";
      if (editThumbnailFile) {
        const thumbResult = await creatorService.uploadThumbnail(
          editTarget.userContentId,
          editThumbnailFile,
        );
        thumbnailUrl = thumbResult.thumbnailUrl || thumbnailUrl;
      }
      await creatorService.updateMetadata(
        editTarget.userContentId,
        editTitle.trim(),
        editDescription.trim() || null,
        thumbnailUrl,
        "ACTIVE",
      );
      // UI에서 즉시 반영
      setMyUploads((prev) =>
        prev.map((item) =>
          item.userContentId === editTarget.userContentId
            ? {
                ...item,
                title: editTitle.trim(),
                thumbnailUrl: thumbnailUrl || item.thumbnailUrl,
              }
            : item,
        ),
      );
      setEditTarget(null);
    } catch (err: any) {
      setAlertModal({
        message: getErrorMessage(err, "수정에 실패했습니다."),
        type: "error",
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── 삭제 ──
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await creatorService.deleteContent(deleteTarget.userContentId);
      // UI에서 즉시 제거 (ES 인덱스 반영 지연 대비)
      setMyUploads((prev) =>
        prev.filter(
          (item) => item.userContentId !== deleteTarget.userContentId,
        ),
      );
      setDeleteTarget(null);
    } catch (err: any) {
      setAlertModal({
        message: getErrorMessage(err, "삭제에 실패했습니다."),
        type: "error",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── 업로드 진행 화면 ──
  if (pageStep === "uploading") {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="max-w-3xl w-full mx-auto px-4">
          <div className="bg-gray-900 rounded-lg p-12 text-center">
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
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="container mx-auto px-4">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-6">
                {myUploads.map((item) => (
                  <div key={item.userContentId} className="group">
                    <div
                      className="relative aspect-[9/16] rounded-lg overflow-hidden bg-gray-800 mb-2 transition-all duration-300 group-hover:ring-2 ring-primary cursor-pointer"
                      onClick={() => navigate(`/creator/${item.userContentId}`)}
                    >
                      {item.thumbnailUrl ? (
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-8 h-8 text-gray-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-10 h-10" />
                      </div>
                    </div>
                    <h3 className="text-sm font-semibold truncate">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-400">
                      조회수 {(item.totalViewCount ?? 0).toLocaleString()}회
                    </p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEdit(item);
                        }}
                        className="text-xs text-gray-400 hover:text-yellow-400 flex items-center gap-1 transition-colors"
                      >
                        <Edit className="w-3 h-3" /> 수정
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                        className="text-xs text-gray-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 수정 모달 */}
          {editTarget && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={() => setEditTarget(null)}
            >
              <div
                className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">콘텐츠 수정</h3>
                  <button
                    onClick={() => setEditTarget(null)}
                    className="p-1 hover:text-gray-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      제목
                    </label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      설명
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      썸네일 변경 (선택)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        setEditThumbnailFile(e.target.files?.[0] || null)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-white file:text-xs"
                    />
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button
                      onClick={() => setEditTarget(null)}
                      className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleEditSave}
                      disabled={editSaving || !editTitle.trim()}
                      className="px-4 py-2 bg-primary rounded hover:bg-primary/80 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {editSaving && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      저장
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 삭제 확인 모달 */}
          {deleteTarget && (
            <div
              className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
              onClick={() => setDeleteTarget(null)}
            >
              <div
                className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-lg font-semibold mb-4">콘텐츠 삭제</h3>
                <p className="text-gray-400 mb-2">"{deleteTarget.title}"</p>
                <p className="text-gray-400 mb-6 text-sm">
                  정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteLoading}
                    className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {deleteLoading && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )}
          {alertModal && (
            <AlertModal
              message={alertModal.message}
              type={alertModal.type}
              onClose={() => setAlertModal(null)}
            />
          )}
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
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium line-clamp-2">
                        {content.title}
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
                  비디오 파일 * (최대 3분)
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
                  <li>• 비디오 길이: 최대 3분(180초)</li>
                  <li>• 업로드 후 트랜스코딩이 완료되면 자동 게시됩니다</li>
                  <li>• 저작권을 침해하는 콘텐츠는 삭제될 수 있습니다</li>
                </ul>
              </div>

              <div className="flex flex-col gap-2">
                {(!formData.title.trim() || !formData.videoFile) && (
                  <p className="text-red-400 text-sm">
                    {!formData.title.trim() && !formData.videoFile
                      ? "제목과 비디오 파일을 입력해주세요."
                      : !formData.title.trim()
                        ? "제목을 입력해주세요."
                        : "비디오 파일을 선택해주세요."}
                  </p>
                )}
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={!formData.title.trim() || !formData.videoFile}
                    className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
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
              </div>
            </form>
          </div>
        </div>
      </div>
      {alertModal && (
        <AlertModal
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal(null)}
        />
      )}
    </div>
  );
};

export default StudioPage;
