import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  Upload,
  Trash2,
  X,
  Eye,
  Edit,
  Video,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { adminService } from "@/services/adminService";
import { profileService } from "@/services/profileService";
import type {
  AdminContent,
  AdminContentDetail,
  AdminContentUpdateRequest,
} from "@/services/adminService";

const ContentsManagement: React.FC<{
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
}> = ({ searchKeyword, setSearchKeyword }) => {
  const [contents, setContents] = useState<AdminContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [sortType, setSortType] = useState("LATEST");

  const [selectedContent, setSelectedContent] =
    useState<AdminContentDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<
    AdminContentUpdateRequest & {
      director?: string;
      actor?: string;
      releaseDate?: string;
    }
  >({});

  // 수정 모달 - 에피소드 편집용
  const [editEpisodes, setEditEpisodes] = useState<
    { videoId: number; episodeNo: number; title: string; description: string }[]
  >([]);
  const [newEpisodeFiles, setNewEpisodeFiles] = useState<
    { file: File; title: string; description: string }[]
  >([]);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStep, setUploadStep] = useState<
    "idle" | "uploading" | "confirming" | "metadata" | "done" | "error"
  >("idle");
  const [uploadProgress, setUploadProgress] = useState("");
  const [uploadedDraft, setUploadedDraft] = useState<{
    contentId: number;
    videoId: number;
  } | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [contentType, setContentType] = useState<"SINGLE" | "SERIES">("SINGLE");
  // 시리즈 에피소드 관리
  const [seriesEpisodes, setSeriesEpisodes] = useState<
    { file: File; title: string; description: string }[]
  >([]);
  const [seriesUploadProgress, setSeriesUploadProgress] = useState("");
  const [metadataForm, setMetadataForm] = useState({
    title: "",
    description: "",
    director: "",
    actor: "",
    releaseDate: "",
    accessLevel: "FREE",
  });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<
    { tagId: number; name: string; priority: number }[]
  >([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const loadContents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, size: 15, sort: sortType };
      if (statusFilter) params.status = statusFilter;
      const data = await adminService.getContents(params);
      setContents(data.content);
      setTotalPages(data.totalPages);
      setTotalElements(data.totalElements);
    } catch (error) {
      console.error("콘텐츠 목록 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [page, sortType, statusFilter]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  useEffect(() => {
    profileService
      .getAllTags()
      .then((tags) => setAllTags(tags.map((t) => ({ ...t, priority: 0 }))))
      .catch(console.error);
  }, []);

  const handleViewDetail = async (contentId: number) => {
    try {
      const detail = await adminService.getContentDetail(contentId);
      setSelectedContent(detail);
      setShowDetailModal(true);
      setEditMode(false);
    } catch (error) {
      console.error("콘텐츠 상세 조회 실패:", error);
      alert("콘텐츠 상세 조회에 실패했습니다.");
    }
  };

  const handleOpenEdit = async (contentId: number) => {
    try {
      const detail = await adminService.getContentDetail(contentId);
      setSelectedContent(detail);
      setShowDetailModal(true);
      // 바로 수정 모드 진입
      let summary = detail.description || "";
      let director = "";
      let actor = "";
      let releaseDate = "";
      try {
        const parsed = JSON.parse(detail.description);
        summary = parsed.summary || parsed.description || "";
        director = parsed.director || "";
        actor = parsed.actor || "";
        releaseDate = parsed.release || "";
      } catch {}
      setEditForm({
        title: detail.title,
        description: summary,
        director,
        actor,
        releaseDate,
        accessLevel: detail.accessLevel,
        status: detail.status,
        tagIds: detail.tags.map((t) => t.tagId),
      });
      setEditEpisodes(
        detail.episodes.map((ep) => ({
          videoId: ep.videoId,
          episodeNo: ep.episodeNo,
          title: ep.title,
          description: ep.description,
        })),
      );
      setNewEpisodeFiles([]);
      setEditMode(true);
    } catch (error) {
      console.error("콘텐츠 상세 조회 실패:", error);
      alert("콘텐츠 상세 조회에 실패했습니다.");
    }
  };

  const handleEditStart = () => {
    if (!selectedContent) return;
    // description이 JSON 문자열일 수 있으므로 파싱
    let summary = selectedContent.description || "";
    let director = "";
    let actor = "";
    let releaseDate = "";
    try {
      const parsed = JSON.parse(selectedContent.description);
      summary = parsed.summary || parsed.description || "";
      director = parsed.director || "";
      actor = parsed.actor || "";
      releaseDate = parsed.release || "";
    } catch {
      // JSON이 아니면 그대로 사용
    }
    setEditForm({
      title: selectedContent.title,
      description: summary,
      director,
      actor,
      releaseDate,
      accessLevel: selectedContent.accessLevel,
      status: selectedContent.status,
      tagIds: selectedContent.tags.map((t) => t.tagId),
    });
    setEditEpisodes(
      selectedContent.episodes.map((ep) => ({
        videoId: ep.videoId,
        episodeNo: ep.episodeNo,
        title: ep.title,
        description: ep.description,
      })),
    );
    setNewEpisodeFiles([]);
    setEditMode(true);
  };

  const handleEditSave = async () => {
    if (!selectedContent) return;
    try {
      const descriptionJson = JSON.stringify({
        summary: editForm.description || "",
        director: editForm.director || "",
        actor: editForm.actor || "",
        release: editForm.releaseDate || "",
      });
      await adminService.updateContentMetadata(selectedContent.contentId, {
        title: editForm.title,
        description: descriptionJson,
        thumbnailUrl: selectedContent.thumbnailUrl,
        accessLevel: editForm.accessLevel,
        status: editForm.status,
        tagIds:
          editForm.tagIds && editForm.tagIds.length > 0
            ? editForm.tagIds
            : undefined,
      });

      // 기존 에피소드 제목/설명 업데이트
      if (selectedContent.type === "SERIES") {
        for (const ep of editEpisodes) {
          try {
            await adminService.updateContentMetadata(
              selectedContent.contentId,
              {
                title: editForm.title,
                description: descriptionJson,
                thumbnailUrl: selectedContent.thumbnailUrl,
                accessLevel: editForm.accessLevel,
                status: editForm.status,
                episode: {
                  videoId: ep.videoId,
                  title: ep.title,
                  description: ep.description,
                },
              } as any,
            );
          } catch (e) {
            console.warn(`에피소드 ${ep.episodeNo} 업데이트 실패:`, e);
          }
        }

        // 새 에피소드 업로드
        for (let i = 0; i < newEpisodeFiles.length; i++) {
          const nep = newEpisodeFiles[i];
          try {
            const epDraft = await adminService.createEpisodeDraft(
              selectedContent.contentId,
            );
            const presign = await adminService.getEpisodePresignedUrl(
              selectedContent.contentId,
              epDraft.videoId,
              nep.file.name,
              nep.file.type || "video/mp4",
            );
            const res = await fetch(presign.putUrl, {
              method: "PUT",
              body: nep.file,
              headers: { "Content-Type": nep.file.type || "video/mp4" },
            });
            if (!res.ok) throw new Error("S3 업로드 실패");
            await adminService.confirmEpisodeUpload(
              selectedContent.contentId,
              epDraft.videoId,
              presign.objectKey,
            );
            // 에피소드 제목/설명 업데이트
            await adminService.updateContentMetadata(
              selectedContent.contentId,
              {
                title: editForm.title,
                description: descriptionJson,
                thumbnailUrl: selectedContent.thumbnailUrl,
                accessLevel: editForm.accessLevel,
                status: editForm.status,
                episode: {
                  videoId: epDraft.videoId,
                  title: nep.title,
                  description: nep.description,
                },
              } as any,
            );
          } catch (e) {
            console.warn(`새 에피소드 ${i + 1} 업로드 실패:`, e);
          }
        }
      }

      alert("수정되었습니다.");
      setShowDetailModal(false);
      loadContents();
    } catch (error: any) {
      console.error("수정 실패:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.data ||
        "수정에 실패했습니다.";
      alert(`수정 실패: ${msg}`);
    }
  };

  const handleDelete = async (contentId: number) => {
    try {
      await adminService.deleteContent(contentId);
      alert("삭제되었습니다.");
      setDeleteTarget(null);
      loadContents();
    } catch (error) {
      console.error("삭제 실패:", error);
      alert("삭제에 실패했습니다.");
    }
  };

  const handleUpload = async () => {
    if (contentType === "SINGLE") {
      await handleSingleUpload();
    } else {
      await handleSeriesUpload();
    }
  };

  const handleSingleUpload = async () => {
    if (!videoFile) return;
    setUploadStep("uploading");
    try {
      setUploadProgress("콘텐츠 초안 생성 중...");
      const draft = await adminService.createVideoDraft();
      setUploadedDraft({ contentId: draft.contentId, videoId: draft.videoId });

      setUploadProgress("업로드 URL 발급 중...");
      const presign = await adminService.getVideoPresignedUrl(
        draft.contentId,
        videoFile.name,
        videoFile.type || "video/mp4",
      );

      setUploadProgress("영상 업로드 중...");
      const res = await fetch(presign.putUrl, {
        method: "PUT",
        body: videoFile,
        headers: { "Content-Type": videoFile.type || "video/mp4" },
      });
      if (!res.ok) throw new Error("S3 업로드 실패");

      setUploadStep("confirming");
      setUploadProgress("업로드 확인 중...");
      await adminService.confirmVideoUpload(
        draft.contentId,
        draft.videoId,
        presign.objectKey,
      );

      setUploadStep("metadata");
      setUploadProgress("");
    } catch (error: any) {
      console.error("업로드 실패:", error);
      setUploadStep("error");
      setUploadProgress(error.message || "업로드에 실패했습니다.");
    }
  };

  // 시리즈 에피소드 업로드 후 videoId 저장
  const [uploadedEpisodeIds, setUploadedEpisodeIds] = useState<number[]>([]);

  const handleSeriesUpload = async () => {
    if (seriesEpisodes.length === 0) return;
    setUploadStep("uploading");
    try {
      setUploadProgress("시리즈 초안 생성 중...");
      const seriesDraft = await adminService.createSeriesDraft();
      const seriesId = seriesDraft.contentId;
      setUploadedDraft({ contentId: seriesId, videoId: 0 });

      const episodeVideoIds: number[] = [];

      for (let i = 0; i < seriesEpisodes.length; i++) {
        const ep = seriesEpisodes[i];
        setSeriesUploadProgress(
          `에피소드 ${i + 1}/${seriesEpisodes.length} 업로드 중...`,
        );

        const epDraft = await adminService.createEpisodeDraft(seriesId);
        episodeVideoIds.push(epDraft.videoId);

        const presign = await adminService.getEpisodePresignedUrl(
          seriesId,
          epDraft.videoId,
          ep.file.name,
          ep.file.type || "video/mp4",
        );

        const res = await fetch(presign.putUrl, {
          method: "PUT",
          body: ep.file,
          headers: { "Content-Type": ep.file.type || "video/mp4" },
        });
        if (!res.ok) throw new Error(`에피소드 ${i + 1} S3 업로드 실패`);

        await adminService.confirmEpisodeUpload(
          seriesId,
          epDraft.videoId,
          presign.objectKey,
        );
      }

      setUploadedEpisodeIds(episodeVideoIds);
      setSeriesUploadProgress("");
      setUploadStep("metadata");
      setUploadProgress("");
    } catch (error: any) {
      console.error("시리즈 업로드 실패:", error);
      setUploadStep("error");
      setUploadProgress(error.message || "시리즈 업로드에 실패했습니다.");
    }
  };

  const handleMetadataSave = async () => {
    if (!uploadedDraft) return;
    try {
      // 썸네일 업로드
      let thumbnailUrl = "TEMP_THUMBNAIL_URL";
      if (thumbnailFile) {
        const thumbResult = await adminService.uploadThumbnail(
          uploadedDraft.contentId,
          thumbnailFile,
        );
        thumbnailUrl = thumbResult.uploadedThumbnailUrl || thumbnailUrl;
      }

      // description은 JSON 컬럼이므로 JSON 형식으로 전달
      const descriptionJson = JSON.stringify({
        summary: metadataForm.description || "",
        director: metadataForm.director || "",
        actor: metadataForm.actor || "",
        release: metadataForm.releaseDate || "",
      });

      await adminService.updateContentMetadata(uploadedDraft.contentId, {
        title: metadataForm.title,
        description: descriptionJson,
        thumbnailUrl,
        accessLevel: metadataForm.accessLevel,
        tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        status: "ACTIVE",
      });

      // 시리즈인 경우 각 에피소드 제목/설명 업데이트
      if (contentType === "SERIES" && uploadedEpisodeIds.length > 0) {
        for (let i = 0; i < uploadedEpisodeIds.length; i++) {
          const ep = seriesEpisodes[i];
          if (ep) {
            try {
              await adminService.updateContentMetadata(
                uploadedDraft.contentId,
                {
                  title: metadataForm.title,
                  description: descriptionJson,
                  thumbnailUrl,
                  accessLevel: metadataForm.accessLevel,
                  status: "ACTIVE",
                  episode: {
                    videoId: uploadedEpisodeIds[i],
                    title: ep.title,
                    description: ep.description,
                  },
                } as any,
              );
            } catch (e) {
              console.warn(`에피소드 ${i + 1} 메타 업데이트 실패:`, e);
            }
          }
        }
      }
      setUploadStep("done");
      setTimeout(() => {
        setShowUploadModal(false);
        resetUpload();
        loadContents();
      }, 1500);
    } catch (error) {
      console.error("메타데이터 저장 실패:", error);
      alert("메타데이터 저장에 실패했습니다.");
    }
  };

  const resetUpload = () => {
    setUploadStep("idle");
    setUploadProgress("");
    setUploadedDraft(null);
    setVideoFile(null);
    setContentType("SINGLE");
    setSeriesEpisodes([]);
    setSeriesUploadProgress("");
    setUploadedEpisodeIds([]);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setMetadataForm({
      title: "",
      description: "",
      director: "",
      actor: "",
      releaseDate: "",
      accessLevel: "FREE",
    });
    setSelectedTagIds([]);
  };

  const formatStatus = (status: string) => {
    const map: Record<string, { label: string; bg: string; text: string }> = {
      ACTIVE: { label: "활성", bg: "rgba(34,197,94,0.2)", text: "#4ade80" },
      HIDDEN: { label: "숨김", bg: "rgba(234,179,8,0.25)", text: "#fde047" },
      DELETED: { label: "삭제됨", bg: "rgba(239,68,68,0.2)", text: "#f87171" },
    };
    const info = map[status] || {
      label: status,
      bg: "rgba(107,114,128,0.2)",
      text: "#9ca3af",
    };
    return (
      <span
        className="px-2 py-1 rounded text-xs"
        style={{ backgroundColor: info.bg, color: info.text }}
      >
        {info.label}
      </span>
    );
  };

  return (
    <div>
      {/* 검색 및 필터 */}
      <div className="mb-6 flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="콘텐츠 제목으로 검색..."
            className="w-full bg-gray-800 border border-gray-700 rounded pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        >
          <option value="">전체 상태</option>
          <option value="ACTIVE">활성</option>
          <option value="HIDDEN">숨김</option>
          <option value="DELETED">삭제됨</option>
        </select>
        <select
          value={sortType}
          onChange={(e) => {
            setSortType(e.target.value);
            setPage(0);
          }}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
        >
          <option value="LATEST">최신순</option>
          <option value="OLDEST">오래된순</option>
        </select>
        <button
          onClick={() => {
            resetUpload();
            setShowUploadModal(true);
          }}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" /> 콘텐츠 등록
        </button>
      </div>

      <p className="text-sm text-gray-400 mb-4">
        총 {totalElements}개의 콘텐츠
      </p>

      {/* 콘텐츠 목록 */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : contents.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>등록된 콘텐츠가 없습니다.</p>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  제목
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  타입
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  상태
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {contents.map((c) => (
                <tr
                  key={c.contentId}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-4 py-3 text-sm">{c.contentId}</td>
                  <td className="px-4 py-3 text-sm font-medium max-w-[300px] truncate">
                    {c.title}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                      {c.type === "SINGLE" ? "단일" : "시리즈"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {formatStatus(c.status)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewDetail(c.contentId)}
                        className="p-1 hover:text-blue-400 transition-colors"
                        title="상세"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEdit(c.contentId)}
                        className="p-1 hover:text-yellow-400 transition-colors"
                        title="수정"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c.contentId)}
                        className="p-1 hover:text-red-500 transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            이전
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const startPage = Math.max(0, Math.min(page - 2, totalPages - 5));
            const p = startPage + i;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded transition-colors ${p === page ? "bg-primary" : "bg-gray-800 hover:bg-gray-700"}`}
              >
                {p + 1}
              </button>
            );
          })}
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            다음
          </button>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteTarget !== null && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">콘텐츠 삭제</h3>
            <p className="text-gray-400 mb-6">
              정말 이 콘텐츠를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                className="px-4 py-2 bg-red-600 rounded hover:bg-red-500 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상세/수정 모달 */}
      {showDetailModal && selectedContent && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">
                {editMode ? "콘텐츠 수정" : "콘텐츠 상세"}
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 hover:text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    제목
                  </label>
                  <input
                    value={editForm.title || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, title: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    설명
                  </label>
                  <textarea
                    value={editForm.description || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, description: e.target.value })
                    }
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      접근 레벨
                    </label>
                    <select
                      value={editForm.accessLevel || ""}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          accessLevel: e.target.value,
                        })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      <option value="FREE">FREE</option>
                      <option value="BASIC">BASIC</option>
                      <option value="UPLUS">UPLUS</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      상태
                    </label>
                    <select
                      value={editForm.status || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, status: e.target.value })
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    >
                      <option value="ACTIVE">활성</option>
                      <option value="HIDDEN">숨김</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      감독
                    </label>
                    <input
                      value={editForm.director || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, director: e.target.value })
                      }
                      placeholder="감독명"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      출연
                    </label>
                    <input
                      value={editForm.actor || ""}
                      onChange={(e) =>
                        setEditForm({ ...editForm, actor: e.target.value })
                      }
                      placeholder="출연진 (쉼표로 구분)"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    개봉일
                  </label>
                  <input
                    type="date"
                    value={editForm.releaseDate || ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, releaseDate: e.target.value })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    태그
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-800 border border-gray-700 rounded p-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag.tagId}
                        type="button"
                        onClick={() => {
                          const current = editForm.tagIds || [];
                          setEditForm({
                            ...editForm,
                            tagIds: current.includes(tag.tagId)
                              ? current.filter((id) => id !== tag.tagId)
                              : [...current, tag.tagId],
                          });
                        }}
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          (editForm.tagIds || []).includes(tag.tagId)
                            ? "bg-primary text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                {/* 시리즈 에피소드 편집 */}
                {selectedContent?.type === "SERIES" && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      에피소드 관리
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {editEpisodes.map((ep, idx) => (
                        <div
                          key={ep.videoId}
                          className="bg-gray-800 rounded p-2 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-primary font-medium text-xs whitespace-nowrap">
                              {ep.episodeNo}화
                            </span>
                            <input
                              value={ep.title}
                              onChange={(e) =>
                                setEditEpisodes((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? { ...item, title: e.target.value }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="에피소드 제목"
                              className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                            />
                          </div>
                          <input
                            value={ep.description}
                            onChange={(e) =>
                              setEditEpisodes((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, description: e.target.value }
                                    : item,
                                ),
                              )
                            }
                            placeholder="에피소드 설명"
                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                          />
                        </div>
                      ))}
                    </div>
                    {/* 새 에피소드 추가 */}
                    <div className="mt-3">
                      <label className="block text-xs text-gray-500 mb-1">
                        새 에피소드 추가
                      </label>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setNewEpisodeFiles((prev) => [
                              ...prev,
                              {
                                file,
                                title: `에피소드 ${editEpisodes.length + prev.length + 1}`,
                                description: "",
                              },
                            ]);
                            e.target.value = "";
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white text-xs file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-primary file:text-white file:text-xs"
                      />
                      {newEpisodeFiles.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {newEpisodeFiles.map((nep, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-800 rounded p-2 space-y-1"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-green-400 font-medium text-xs whitespace-nowrap">
                                  NEW
                                </span>
                                <input
                                  value={nep.title}
                                  onChange={(e) =>
                                    setNewEpisodeFiles((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? { ...item, title: e.target.value }
                                          : item,
                                      ),
                                    )
                                  }
                                  placeholder="에피소드 제목"
                                  className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                                />
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {(nep.file.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setNewEpisodeFiles((prev) =>
                                      prev.filter((_, i) => i !== idx),
                                    )
                                  }
                                  className="text-red-400 hover:text-red-300 text-xs"
                                >
                                  삭제
                                </button>
                              </div>
                              <input
                                value={nep.description}
                                onChange={(e) =>
                                  setNewEpisodeFiles((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? {
                                            ...item,
                                            description: e.target.value,
                                          }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="에피소드 설명"
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setEditMode(false)}
                    className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleEditSave}
                    className="px-4 py-2 bg-primary rounded hover:bg-primary/80"
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-4">
                  {selectedContent.thumbnailUrl && (
                    <img
                      src={selectedContent.thumbnailUrl}
                      alt=""
                      className="w-48 h-28 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold mb-2">
                      {selectedContent.title}
                    </h4>
                    <div className="flex gap-2 mb-2">
                      <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                        {selectedContent.type === "SINGLE" ? "단일" : "시리즈"}
                      </span>
                      {formatStatus(selectedContent.status)}
                      <span
                        className={`px-2 py-1 rounded text-xs ${selectedContent.accessLevel === "UPLUS" ? "bg-primary/20 text-primary" : "bg-gray-500/20 text-gray-300"}`}
                      >
                        {selectedContent.accessLevel}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">
                      등록일:{" "}
                      {new Date(selectedContent.createdAt).toLocaleString(
                        "ko-KR",
                      )}
                    </p>
                  </div>
                </div>
                {selectedContent.description && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      설명
                    </label>
                    <p className="text-sm bg-gray-800 rounded p-3">
                      {selectedContent.description}
                    </p>
                  </div>
                )}
                {selectedContent.tags.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      태그
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.tags.map((tag) => (
                        <span
                          key={tag.tagId}
                          className="px-2 py-1 bg-gray-800 rounded text-xs"
                        >
                          #{tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedContent.episodes.length > 0 && (
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      에피소드 ({selectedContent.episodes.length}개)
                    </label>
                    <div className="space-y-2">
                      {selectedContent.episodes.map((ep) => (
                        <div
                          key={ep.videoId}
                          className="bg-gray-800 rounded p-3 text-sm"
                        >
                          <span className="text-primary font-medium">
                            {ep.episodeNo}화
                          </span>{" "}
                          · {ep.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => {
            if (
              uploadStep === "idle" ||
              uploadStep === "done" ||
              uploadStep === "error"
            ) {
              setShowUploadModal(false);
              resetUpload();
            }
          }}
        >
          <div
            className="bg-gray-900 rounded-lg p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">콘텐츠 등록</h3>
              {(uploadStep === "idle" ||
                uploadStep === "done" ||
                uploadStep === "error") && (
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUpload();
                  }}
                  className="p-1 hover:text-gray-400"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {uploadStep === "idle" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    콘텐츠 타입
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setContentType("SINGLE")}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        contentType === "SINGLE"
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      단일 영상
                    </button>
                    <button
                      type="button"
                      onClick={() => setContentType("SERIES")}
                      className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                        contentType === "SERIES"
                          ? "bg-primary text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      시리즈
                    </button>
                  </div>
                </div>

                {contentType === "SINGLE" ? (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      영상 파일 선택
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) =>
                        setVideoFile(e.target.files?.[0] || null)
                      }
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm"
                    />
                    {videoFile && (
                      <p className="text-xs text-gray-400 mt-2">
                        {videoFile.name} (
                        {(videoFile.size / 1024 / 1024).toFixed(1)}MB)
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      에피소드 추가
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSeriesEpisodes((prev) => [
                            ...prev,
                            {
                              file,
                              title: `에피소드 ${prev.length + 1}`,
                              description: "",
                            },
                          ]);
                          e.target.value = "";
                        }
                      }}
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm"
                    />
                    {seriesEpisodes.length > 0 && (
                      <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                        {seriesEpisodes.map((ep, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-800 rounded p-2 text-sm space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-primary font-medium whitespace-nowrap">
                                {idx + 1}화
                              </span>
                              <input
                                value={ep.title}
                                onChange={(e) =>
                                  setSeriesEpisodes((prev) =>
                                    prev.map((item, i) =>
                                      i === idx
                                        ? { ...item, title: e.target.value }
                                        : item,
                                    ),
                                  )
                                }
                                placeholder="에피소드 제목"
                                className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                              />
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                {(ep.file.size / 1024 / 1024).toFixed(1)}MB
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setSeriesEpisodes((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                                className="text-red-400 hover:text-red-300 text-xs whitespace-nowrap"
                              >
                                삭제
                              </button>
                            </div>
                            <input
                              value={ep.description}
                              onChange={(e) =>
                                setSeriesEpisodes((prev) =>
                                  prev.map((item, i) =>
                                    i === idx
                                      ? {
                                          ...item,
                                          description: e.target.value,
                                        }
                                      : item,
                                  ),
                                )
                              }
                              placeholder="에피소드 설명"
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={
                    contentType === "SINGLE"
                      ? !videoFile
                      : seriesEpisodes.length === 0
                  }
                  className="w-full btn-primary py-2.5 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" /> 업로드 시작
                </button>
              </div>
            )}

            {(uploadStep === "uploading" || uploadStep === "confirming") && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
                <p className="text-gray-300">{uploadProgress}</p>
                {seriesUploadProgress && (
                  <p className="text-gray-400 text-sm mt-2">
                    {seriesUploadProgress}
                  </p>
                )}
              </div>
            )}

            {uploadStep === "metadata" && (
              <div className="space-y-4">
                <p className="text-sm text-green-400 flex items-center gap-1 mb-2">
                  <Check className="w-4 h-4" /> 영상 업로드 완료. 메타데이터를
                  입력해주세요.
                </p>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    제목
                  </label>
                  <input
                    value={metadataForm.title}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        title: e.target.value,
                      })
                    }
                    placeholder="콘텐츠 제목"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    설명
                  </label>
                  <textarea
                    value={metadataForm.description}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        description: e.target.value,
                      })
                    }
                    rows={3}
                    placeholder="콘텐츠 설명"
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    접근 레벨
                  </label>
                  <select
                    value={metadataForm.accessLevel}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        accessLevel: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  >
                    <option value="FREE">FREE (무료)</option>
                    <option value="BASIC">BASIC (베이직 구독)</option>
                    <option value="UPLUS">UPLUS (U+ 전용)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      감독
                    </label>
                    <input
                      value={metadataForm.director}
                      onChange={(e) =>
                        setMetadataForm({
                          ...metadataForm,
                          director: e.target.value,
                        })
                      }
                      placeholder="감독명"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">
                      출연
                    </label>
                    <input
                      value={metadataForm.actor}
                      onChange={(e) =>
                        setMetadataForm({
                          ...metadataForm,
                          actor: e.target.value,
                        })
                      }
                      placeholder="출연진 (쉼표로 구분)"
                      className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    개봉일
                  </label>
                  <input
                    type="date"
                    value={metadataForm.releaseDate}
                    onChange={(e) =>
                      setMetadataForm({
                        ...metadataForm,
                        releaseDate: e.target.value,
                      })
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    태그
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto bg-gray-800 border border-gray-700 rounded p-2">
                    {allTags.map((tag) => (
                      <button
                        key={tag.tagId}
                        type="button"
                        onClick={() =>
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.tagId)
                              ? prev.filter((id) => id !== tag.tagId)
                              : [...prev, tag.tagId],
                          )
                        }
                        className={`px-2 py-1 rounded text-xs transition-colors ${
                          selectedTagIds.includes(tag.tagId)
                            ? "bg-primary text-white"
                            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                        }`}
                      >
                        #{tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    썸네일 이미지
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setThumbnailFile(file);
                      if (file) {
                        setThumbnailPreview(URL.createObjectURL(file));
                      } else {
                        setThumbnailPreview(null);
                      }
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm"
                  />
                  {thumbnailPreview && (
                    <img
                      src={thumbnailPreview}
                      alt="썸네일 미리보기"
                      className="mt-2 w-full h-32 object-cover rounded"
                    />
                  )}
                </div>
                <button
                  onClick={handleMetadataSave}
                  disabled={!metadataForm.title.trim()}
                  className="w-full btn-primary py-2.5 disabled:opacity-50"
                >
                  등록 완료
                </button>
              </div>
            )}

            {uploadStep === "done" && (
              <div className="text-center py-8">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-green-400 font-semibold">
                  콘텐츠가 등록되었습니다.
                </p>
              </div>
            )}

            {uploadStep === "error" && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-red-400 mb-4">{uploadProgress}</p>
                <button
                  onClick={resetUpload}
                  className="btn-secondary px-6 py-2"
                >
                  다시 시도
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentsManagement;
