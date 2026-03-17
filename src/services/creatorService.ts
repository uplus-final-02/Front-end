import axios from "axios";
import apiClient from "./apiClient";

// ── Feed 관련 타입 ──

export interface FeedItem {
  userContentId: number;
  parentContentId: number | null;
  title: string;
  thumbnailUrl: string | null;
  accessLevel: string;
  totalViewCount: number;
  bookmarkCount: number;
  tags: string[];
}

export interface FeedResponse {
  items: FeedItem[];
  nextSeedId: number | null;
  hasMore: boolean;
}

// ── Play 관련 타입 ──

export interface UserContentPlayInfo {
  videoId: number;
  title: string;
  description: string;
  thumbnailUrl: string | null;
  viewCount: number;
  durationSec: number;
  createdAt: string;
  status: string;
  tags: string[];
  uploaderType: string;
  uploaderNickname: string;
  url: string | null;
  isBookmarked: boolean;
  playbackState: { startPositionSec: number; lastUpdated: string } | null;
  context: {
    isSeries: boolean;
    contentsId: number;
    episodeNumber: number;
    nextVideoId: number | null;
    prevVideoId: number | null;
  };
  policy?: string;
  signature?: string;
  keyPairId?: string;
  parentContent?: {
    contentId: number;
    title: string;
    thumbnailUrl: string | null;
  } | null;
}

// ── 댓글 관련 타입 ──

export interface Comment {
  commentId: number;
  body: string;
  createdAt: string;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface CommentPage {
  content: Comment[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}

// ── 원본 콘텐츠(관리자) 관련 타입 ──

export interface ParentContent {
  contentId: number;
  title: string;
  thumbnailUrl: string | null;
  totalViewCount: number;
  tags: { tagId: number; name: string }[];
}

// ── 업로드 관련 타입 ──

export interface DraftResponse {
  userContentId: number;
  userVideoFileId: number;
}

export interface PresignResponse {
  userContentId: number;
  objectKey: string;
  putUrl: string;
  expiresAt: string;
}

export interface ConfirmResponse {
  userContentId: number;
  userVideoFileId: number;
  originalKey: string;
  transcodeStatus: string;
}

export interface ThumbnailUploadResponse {
  userContentId: number;
  thumbnailUrl: string;
}

// ── CloudFront 도메인 ──
const CF_DOMAIN = "https://dpfh72fut41hj.cloudfront.net";

// ── API 함수들 ──

export const creatorService = {
  /**
   * 숏폼 피드 조회
   * GET /api/user-contents/feed
   */
  getFeed: async (
    seedId?: number | null,
    size = 10,
    excludeIds: number[] = [],
  ): Promise<FeedResponse> => {
    const params: Record<string, string> = { size: String(size) };
    if (seedId) params.seedId = String(seedId);
    if (excludeIds.length > 0) params.excludeIds = excludeIds.join(",");

    const res = await apiClient.get("/api/user-contents/feed", { params });
    return res.data.data;
  },

  /**
   * 유저 콘텐츠 재생 정보 + CloudFront 쿠키 셋업
   * GET /api/user/contents/{id}/play
   */
  getPlayInfo: async (userContentId: number): Promise<UserContentPlayInfo> => {
    const res = await apiClient.get(`/api/user/contents/${userContentId}/play`);
    const data: UserContentPlayInfo = res.data.data;

    // CloudFront signed cookie 셋업
    if (data.policy && data.signature && data.keyPairId) {
      try {
        await axios.get(`${CF_DOMAIN}/set-cookie`, {
          params: {
            policy: data.policy,
            signature: data.signature,
            keyPairId: data.keyPairId,
          },
          withCredentials: true,
        });
      } catch (e) {
        console.warn("CloudFront 쿠키 셋업 실패:", e);
      }
    }

    return data;
  },

  /**
   * 조회수 증가
   * POST /api/user/contents/{id}/views
   */
  increaseViewCount: async (userContentId: number): Promise<void> => {
    await apiClient.post(`/api/user/contents/${userContentId}/views`);
  },

  // ── 댓글 ──

  /**
   * 댓글 목록 조회
   * GET /api/videos/{videoId}/comments
   */
  getComments: async (
    videoId: number,
    page = 0,
    size = 20,
  ): Promise<CommentPage> => {
    const res = await apiClient.get(`/api/videos/${videoId}/comments`, {
      params: { page, size },
    });
    return res.data.data;
  },

  /**
   * 댓글 작성
   * POST /api/videos/{videoId}/comments
   */
  createComment: async (videoId: number, body: string): Promise<void> => {
    await apiClient.post(`/api/videos/${videoId}/comments`, { body });
  },

  /**
   * 댓글 삭제
   * DELETE /api/videos/{videoId}/comments/{commentId}
   */
  deleteComment: async (videoId: number, commentId: number): Promise<void> => {
    await apiClient.delete(`/api/videos/${videoId}/comments/${commentId}`);
  },

  // ── 업로드 ──

  /**
   * 관리자 콘텐츠 목록 조회 (원본 콘텐츠 선택용)
   * GET /api/contents/home/default-list
   */
  getParentContents: async (
    page = 0,
    size = 20,
    tag?: string,
  ): Promise<ParentContent[]> => {
    const params: Record<string, string> = {
      uploaderType: "ADMIN",
      page: String(page),
      size: String(size),
    };
    if (tag) params.tag = tag;
    const res = await apiClient.get("/api/contents/home/default-list", {
      params,
    });
    return res.data.data;
  },

  /**
   * 1단계: 드래프트 생성
   * POST /api/user/uploads/draft
   */
  createDraft: async (
    parentContentId?: number | null,
  ): Promise<DraftResponse> => {
    const res = await apiClient.post("/api/user/uploads/draft", {
      parentContentId: parentContentId ?? null,
    });
    return res.data;
  },

  /**
   * 2단계: Presigned URL 발급
   * POST /api/user/uploads/presign
   */
  getPresignedUrl: async (
    userContentId: number,
    originalFilename: string,
    contentType: string,
  ): Promise<PresignResponse> => {
    const res = await apiClient.post("/api/user/uploads/presign", {
      userContentId,
      originalFilename,
      contentType,
    });
    return res.data;
  },

  /**
   * 3단계: S3에 직접 업로드 (presigned PUT)
   */
  uploadToS3: async (putUrl: string, file: File): Promise<void> => {
    await axios.put(putUrl, file, {
      headers: { "Content-Type": file.type },
    });
  },

  /**
   * 4단계: 업로드 확인 → 트랜스코딩 시작
   * POST /api/user/uploads/confirm
   */
  confirmUpload: async (
    userContentId: number,
    objectKey: string,
  ): Promise<ConfirmResponse> => {
    const res = await apiClient.post("/api/user/uploads/confirm", {
      userContentId,
      objectKey,
    });
    return res.data;
  },

  /**
   * 메타데이터 수정 (제목, 설명)
   * PUT /api/user/contents/{id}/metadata
   */
  updateMetadata: async (
    userContentId: number,
    title: string,
    description: string | null,
  ): Promise<void> => {
    const body: Record<string, unknown> = { title };
    if (description) {
      // description 컬럼이 json 타입이므로 JSON 문자열로 감싸서 전송
      body.description = JSON.stringify(description);
    }
    await apiClient.put(`/api/user/contents/${userContentId}/metadata`, body);
  },

  /**
   * 썸네일 업로드
   * POST /api/user/contents/{id}/thumbnail
   */
  uploadThumbnail: async (
    userContentId: number,
    file: File,
  ): Promise<ThumbnailUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post(
      `/api/user/contents/${userContentId}/thumbnail`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return res.data.data;
  },

  /**
   * 내가 올린 콘텐츠 목록
   * GET /api/search/creator/user?uploaderId={userId}
   */
  getMyUploads: async (
    uploaderId: number,
    page = 0,
    size = 20,
  ): Promise<FeedItem[]> => {
    const res = await apiClient.get("/api/search/creator/user", {
      params: { uploaderId, page, size },
    });
    return res.data.data;
  },
};
