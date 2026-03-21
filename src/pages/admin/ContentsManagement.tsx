import React, { useState, useEffect, useCallback, useRef } from "react";
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
import {
  subscribeAdminTranscode,
  type SSESubscription,
  type TranscodeResultEvent,
} from "@/services/sseService";
import type {
  AdminContent,
  AdminContentDetail,
  AdminContentUpdateRequest,
} from "@/services/adminService";
import AlertModal from "@/components/common/AlertModal";

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
  const [appliedKeyword, setAppliedKeyword] = useState("");

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
  const [, setThumbnailPreview] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<
    { tagId: number; name: string; priority: number }[]
  >([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [transcodeStatus, setTranscodeStatus] = useState<
    "idle" | "waiting" | "done" | "failed"
  >("idle");
  const [transcodeReason, setTranscodeReason] = useState("");
  const [alertModal, setAlertModal] = useState<{
    message: string;
    type: "success" | "error" | "info";
    onClose?: () => void;
  } | null>(null);

  // 목록에서 트랜스코딩 진행 중인 콘텐츠의 실시간 상태 추적
  // 업로드 직후 등록된 콘텐츠만 추적 (uploadedDraft 기반)
  const listSseRefs = useRef<Map<number, SSESubscription>>(new Map());
  const [transcodeProgress, setTranscodeProgress] = useState<
    Map<number, "waiting" | "done" | "failed">
  >(new Map());

  // SSE 정리
  useEffect(() => {
    return () => {
      listSseRefs.current.forEach((sub) => sub.close());
      listSseRefs.current.clear();
    };
  }, []);

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

  // HIDDEN 콘텐츠에 SSE 구독 시작 (트랜스코딩 완료 감지)
  const startTranscodeWatch = (contentId: number) => {
    if (listSseRefs.current.has(contentId)) return; // 이미 구독 중
    setTranscodeProgress((prev) => {
      const next = new Map(prev);
      next.set(contentId, "waiting");
      return next;
    });
    const sub = subscribeAdminTranscode(
      contentId,
      async (event: TranscodeResultEvent) => {
        listSseRefs.current.get(contentId)?.close();
        listSseRefs.current.delete(contentId);
        if (event.transcodeStatus === "DONE") {
          // 트랜스코딩 완료 → 자동으로 ACTIVE 전환
          try {
            const detail = await adminService.getContentDetail(contentId);
            await adminService.updateContentMetadata(contentId, {
              title: detail.title,
              description: detail.description,
              thumbnailUrl: detail.thumbnailUrl || "",
              accessLevel: detail.accessLevel,
              status: "ACTIVE",
              tagIds:
                detail.tags.length > 0
                  ? detail.tags.map((t) => t.tagId)
                  : undefined,
            });
          } catch (e) {
            console.warn("자동 활성화 실패:", e);
          }
          setTranscodeProgress((prev) => {
            const next = new Map(prev);
            next.set(contentId, "done");
            return next;
          });
          if (selectedContent?.contentId === contentId) {
            adminService
              .getContentDetail(contentId)
              .then((detail) => setSelectedContent(detail))
              .catch(() => {});
          }
          loadContents();
        } else {
          setTranscodeProgress((prev) => {
            const next = new Map(prev);
            next.set(contentId, "failed");
            return next;
          });
        }
      },
      () => {},
    );
    listSseRefs.current.set(contentId, sub);
  };

  const handleViewDetail = async (contentId: number) => {
    try {
      const detail = await adminService.getContentDetail(contentId);
      setSelectedContent(detail);
      setShowDetailModal(true);
      setEditMode(false);
      // HIDDEN이면 SSE 구독으로 트랜스코딩 완료 감지
      if (detail.status === "HIDDEN") {
        startTranscodeWatch(contentId);
      }
    } catch (error) {
      console.error("콘텐츠 상세 조회 실패:", error);
      setAlertModal({
        message: "콘텐츠 상세 조회에 실패했습니다.",
        type: "error",
      });
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
      // HIDDEN이면 SSE 구독으로 트랜스코딩 완료 감지
      if (detail.status === "HIDDEN") {
        startTranscodeWatch(contentId);
      }
    } catch (error) {
      console.error("콘텐츠 상세 조회 실패:", error);
      setAlertModal({
        message: "콘텐츠 상세 조회에 실패했습니다.",
        type: "error",
      });
    }
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
      const result = await adminService.updateContentMetadata(
        selectedContent.contentId,
        {
          title: editForm.title,
          description: descriptionJson,
          thumbnailUrl: selectedContent.thumbnailUrl,
          accessLevel: editForm.accessLevel,
          status: editForm.status,
          tagIds:
            editForm.tagIds && editForm.tagIds.length > 0
              ? editForm.tagIds
              : undefined,
        },
      );

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

      // 활성화 요청했는데 트랜스코딩 미완료로 HIDDEN 유지된 경우
      const requestedActive = editForm.status === "ACTIVE";
      const requestedHidden = editForm.status === "HIDDEN";
      const actualStatus = result?.status;
      console.log("[수정 응답]", result);

      // 의도적으로 HIDDEN으로 내린 경우 — 트랜스코딩 추적 제거
      if (requestedHidden) {
        listSseRefs.current.get(selectedContent.contentId)?.close();
        listSseRefs.current.delete(selectedContent.contentId);
        setTranscodeProgress((prev) => {
          const next = new Map(prev);
          next.delete(selectedContent.contentId);
          return next;
        });
        setAlertModal({ message: "수정되었습니다.", type: "success" });
      } else if (requestedActive && actualStatus && actualStatus !== "ACTIVE") {
        // 트랜스코딩 완료 대기를 위해 SSE 구독 시작
        startTranscodeWatch(selectedContent.contentId);
        setAlertModal({
          message: `트랜스코딩이 아직 완료되지 않아 활성화할 수 없습니다.\nSSE로 트랜스코딩 완료를 감지 중입니다.\n완료되면 목록이 자동 갱신됩니다.`,
          type: "info",
        });
      } else {
        setAlertModal({ message: "수정되었습니다.", type: "success" });
      }
      setShowDetailModal(false);
      loadContents();
    } catch (error: any) {
      console.error("수정 실패:", error);
      const msg =
        error.response?.data?.message ||
        error.response?.data?.data ||
        "수정에 실패했습니다.";
      setAlertModal({ message: `수정 실패: ${msg}`, type: "error" });
    }
  };

  const handleDelete = async (contentId: number) => {
    try {
      await adminService.deleteContent(contentId);
      setAlertModal({ message: "삭제되었습니다.", type: "success" });
      setDeleteTarget(null);
      loadContents();
    } catch (error) {
      console.error("삭제 실패:", error);
      setAlertModal({ message: "삭제에 실패했습니다.", type: "error" });
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
      let thumbnailUrl = "";
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
        status: "HIDDEN",
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
                  status: "HIDDEN",
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
      // 목록 즉시 갱신 — 새 콘텐츠가 목록에 바로 보이도록
      loadContents();
      // SSE 구독 시작 — 트랜스코딩 완료 시 자동 갱신 (모달과 독립적으로 유지)
      setTranscodeStatus("waiting");
      const cid = uploadedDraft.contentId;
      setTranscodeProgress((prev) => {
        const next = new Map(prev);
        next.set(cid, "waiting");
        return next;
      });
      // 기존 구독 정리 후 listSseRefs에 등록 (모달 닫아도 유지됨)
      listSseRefs.current.get(cid)?.close();
      const sub = subscribeAdminTranscode(
        cid,
        async (event: TranscodeResultEvent) => {
          listSseRefs.current.get(cid)?.close();
          listSseRefs.current.delete(cid);
          if (event.transcodeStatus === "DONE") {
            // 트랜스코딩 완료 → 자동으로 ACTIVE 전환
            try {
              const detail = await adminService.getContentDetail(cid);
              await adminService.updateContentMetadata(cid, {
                title: detail.title,
                description: detail.description,
                thumbnailUrl: detail.thumbnailUrl || thumbnailUrl,
                accessLevel: detail.accessLevel,
                status: "ACTIVE",
                tagIds:
                  detail.tags.length > 0
                    ? detail.tags.map((t) => t.tagId)
                    : undefined,
              });
            } catch (e) {
              console.warn("자동 활성화 실패:", e);
            }
            setTranscodeStatus("done");
            setTranscodeProgress((prev) => {
              const next = new Map(prev);
              next.set(cid, "done");
              return next;
            });
            loadContents();
          } else {
            setTranscodeStatus("failed");
            setTranscodeReason(event.reason || "트랜스코딩 실패");
            setTranscodeProgress((prev) => {
              const next = new Map(prev);
              next.set(cid, "failed");
              return next;
            });
          }
        },
        () => {
          // SSE 연결 실패 시 무시
        },
      );
      listSseRefs.current.set(cid, sub);

      // SSE 폴백: 폴링으로 트랜스코딩 상태 확인 (SSE가 안 될 경우 대비)
      const pollInterval = setInterval(async () => {
        try {
          const detail = await adminService.getContentDetail(cid);
          if (detail.status === "ACTIVE") {
            // 이미 활성화됨 (백엔드 자동 전환 또는 SSE 콜백 성공)
            clearInterval(pollInterval);
            setTranscodeStatus("done");
            setTranscodeProgress((prev) => {
              const next = new Map(prev);
              next.set(cid, "done");
              return next;
            });
            listSseRefs.current.get(cid)?.close();
            listSseRefs.current.delete(cid);
            loadContents();
          } else if (detail.status === "HIDDEN") {
            // 아직 HIDDEN → ACTIVE 전환 시도 (트랜스코딩 완료됐으면 백엔드가 활성화해줌)
            try {
              await adminService.updateContentMetadata(cid, {
                title: detail.title,
                description: detail.description,
                thumbnailUrl: detail.thumbnailUrl || "",
                accessLevel: detail.accessLevel,
                status: "ACTIVE",
                tagIds:
                  detail.tags.length > 0
                    ? detail.tags.map((t) => t.tagId)
                    : undefined,
              });
              const refreshed = await adminService.getContentDetail(cid);
              if (refreshed.status === "ACTIVE") {
                clearInterval(pollInterval);
                setTranscodeStatus("done");
                setTranscodeProgress((prev) => {
                  const next = new Map(prev);
                  next.set(cid, "done");
                  return next;
                });
                listSseRefs.current.get(cid)?.close();
                listSseRefs.current.delete(cid);
                loadContents();
              }
            } catch {
              // 활성화 실패 (트랜스코딩 미완료) → 다음 폴링에서 재시도
            }
          }
        } catch {
          // 폴링 실패 무시
        }
      }, 5000);
      // 5분 후 폴링 중단
      setTimeout(() => clearInterval(pollInterval), 300000);
    } catch (error) {
      console.error("메타데이터 저장 실패:", error);
      setAlertModal({
        message: "메타데이터 저장에 실패했습니다.",
        type: "error",
      });
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
    setTranscodeStatus("idle");
    setTranscodeReason("");
  };

  const formatStatus = (status: string, contentId?: number) => {
    // HIDDEN 상태일 때 트랜스코딩 실시간 상태 확인
    if (status === "HIDDEN" && contentId) {
      const liveStatus = transcodeProgress.get(contentId);

      if (liveStatus === "done") {
        return (
          <span
            className="px-2 py-1 rounded text-xs flex items-center gap-1 w-fit"
            style={{
              backgroundColor: "rgba(34,197,94,0.2)",
              color: "#4ade80",
            }}
          >
            <Check className="w-3 h-3" /> 트랜스코딩 완료
          </span>
        );
      }
      if (liveStatus === "failed") {
        return (
          <span
            className="px-2 py-1 rounded text-xs flex items-center gap-1 w-fit"
            style={{
              backgroundColor: "rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            <AlertCircle className="w-3 h-3" /> 트랜스코딩 실패
          </span>
        );
      }
      if (liveStatus === "waiting") {
        return (
          <span
            className="px-2 py-1 rounded text-xs flex items-center gap-1 w-fit"
            style={{
              backgroundColor: "rgba(234,179,8,0.25)",
              color: "#fde047",
            }}
          >
            <Loader2 className="w-3 h-3 animate-spin" /> 트랜스코딩 중
          </span>
        );
      }
    }

    const map: Record<string, { label: string; bg: string; text: string }> = {
      ACTIVE: { label: "활성", bg: "rgba(34,197,94,0.2)", text: "#4ade80" },
      HIDDEN: {
        label: "숨김",
        bg: "rgba(107,114,128,0.2)",
        text: "#9ca3af",
      },
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
            onKeyDown={(e) => {
              if (e.key === "Enter") setAppliedKeyword(searchKeyword);
            }}
            placeholder="콘텐츠 제목으로 검색 (Enter)"
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
              {contents
                .filter(
                  (c) =>
                    !appliedKeyword.trim() ||
                    c.title
                      .toLowerCase()
                      .includes(appliedKeyword.trim().toLowerCase()),
                )
                .map((c) => (
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
                      {formatStatus(c.status, c.contentId)}
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
                    disabled={
                      !editForm.title?.trim() ||
                      !editForm.description?.trim() ||
                      !editForm.director?.trim() ||
                      !editForm.actor?.trim() ||
                      !editForm.releaseDate ||
                      !editForm.tagIds ||
                      editForm.tagIds.length === 0
                    }
                    className="px-4 py-2 bg-primary rounded hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    저장
                  </button>
                </div>
                {(!editForm.title?.trim() ||
                  !editForm.description?.trim() ||
                  !editForm.director?.trim() ||
                  !editForm.actor?.trim() ||
                  !editForm.releaseDate ||
                  !editForm.tagIds ||
                  editForm.tagIds.length === 0) && (
                  <p className="text-xs text-red-400 text-center">
                    모든 항목을 입력해주세요.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* 상태 안내 */}
                {selectedContent.status === "HIDDEN" &&
                  (() => {
                    const liveStatus = transcodeProgress.get(
                      selectedContent.contentId,
                    );
                    if (liveStatus === "done") {
                      return (
                        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                          <p className="text-green-400 text-sm font-semibold mb-1">
                            ✅ 트랜스코딩 완료
                          </p>
                          <p className="text-gray-400 text-xs leading-relaxed">
                            수정 버튼을 눌러 상태를 "활성"으로 변경하면
                            사용자에게 공개됩니다.
                          </p>
                        </div>
                      );
                    }
                    if (liveStatus === "failed") {
                      return (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                          <p className="text-red-400 text-sm font-semibold mb-1">
                            ❌ 트랜스코딩 실패
                          </p>
                          <p className="text-gray-400 text-xs leading-relaxed">
                            영상 파일에 문제가 있을 수 있습니다. 콘텐츠를
                            삭제하고 다시 업로드해주세요.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-4">
                        <p className="text-gray-400 text-sm font-semibold mb-1">
                          숨김 상태
                        </p>
                        <p className="text-gray-400 text-xs leading-relaxed">
                          수정 버튼을 눌러 상태를 "활성"으로 변경할 수 있습니다.
                          트랜스코딩이 완료되지 않았으면 활성화되지 않습니다.
                        </p>
                      </div>
                    );
                  })()}
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
                      {formatStatus(
                        selectedContent.status,
                        selectedContent.contentId,
                      )}
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
                    <div className="text-sm bg-gray-800 rounded p-3 space-y-1">
                      {(() => {
                        try {
                          const parsed = JSON.parse(
                            selectedContent.description,
                          );
                          const labels: Record<string, string> = {
                            summary: "줄거리",
                            director: "감독",
                            actor: "출연",
                            release: "개봉일",
                          };
                          return Object.entries(parsed)
                            .filter(([, v]) => v)
                            .map(([key, value]) => (
                              <p key={key}>
                                <span className="text-gray-400">
                                  {labels[key] || key}:
                                </span>{" "}
                                {String(value)}
                              </p>
                            ));
                        } catch {
                          return <p>{selectedContent.description}</p>;
                        }
                      })()}
                    </div>
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
                    }}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-primary file:text-white file:text-sm"
                  />
                  {thumbnailFile && (
                    <p className="text-xs text-gray-400 mt-1">
                      {thumbnailFile.name}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleMetadataSave}
                  disabled={
                    !metadataForm.title.trim() ||
                    !metadataForm.description.trim() ||
                    !metadataForm.director.trim() ||
                    !metadataForm.actor.trim() ||
                    !metadataForm.releaseDate ||
                    !thumbnailFile ||
                    selectedTagIds.length === 0
                  }
                  className="w-full btn-primary py-2.5 disabled:opacity-50"
                >
                  등록 완료
                </button>
                {(!metadataForm.title.trim() ||
                  !metadataForm.description.trim() ||
                  !metadataForm.director.trim() ||
                  !metadataForm.actor.trim() ||
                  !metadataForm.releaseDate ||
                  !thumbnailFile ||
                  selectedTagIds.length === 0) && (
                  <p className="text-xs text-red-400 mt-2 text-center">
                    모든 항목을 입력하고 썸네일을 업로드해주세요.
                  </p>
                )}
              </div>
            )}

            {uploadStep === "done" && (
              <div className="text-center py-8">
                <Check className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <p className="text-green-400 font-semibold mb-2">
                  콘텐츠가 등록되었습니다.
                </p>

                {transcodeStatus === "waiting" && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mt-4 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                      <p className="text-yellow-400 text-sm font-semibold">
                        트랜스코딩 진행 중...
                      </p>
                    </div>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      실시간으로 트랜스코딩 상태를 감지하고 있습니다. 완료되면
                      자동으로 콘텐츠 목록이 갱신됩니다.
                    </p>
                  </div>
                )}

                {transcodeStatus === "done" && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mt-4 text-left">
                    <p className="text-green-400 text-sm font-semibold mb-1">
                      ✅ 트랜스코딩 완료
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      콘텐츠가 자동으로{" "}
                      <span className="text-green-400">활성</span> 상태로
                      전환되었습니다.
                    </p>
                  </div>
                )}

                {transcodeStatus === "failed" && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mt-4 text-left">
                    <p className="text-red-400 text-sm font-semibold mb-1">
                      ❌ 트랜스코딩 실패
                    </p>
                    <p className="text-gray-400 text-xs leading-relaxed">
                      {transcodeReason || "알 수 없는 오류가 발생했습니다."}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUpload();
                    loadContents();
                  }}
                  className="btn-primary px-6 py-2 mt-4"
                >
                  닫기
                </button>
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
      {alertModal && (
        <AlertModal
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => {
            const cb = alertModal.onClose;
            setAlertModal(null);
            cb?.();
          }}
        />
      )}
    </div>
  );
};

export default ContentsManagement;
