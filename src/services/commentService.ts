import apiClient from "./apiClient";

export interface CommentDto {
  commentId: number;
  body: string;
  createdAt: string;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface CommentPage {
  content: CommentDto[];
  totalElements: number;
  totalPages: number;
  number: number;
  last: boolean;
}

const CF_DOMAIN = "https://dpfh72fut41hj.cloudfront.net";

/** 상대 경로인 profileImageUrl에 CloudFront 도메인 prefix 추가 */
const normalizeProfileUrl = (url: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${CF_DOMAIN}/${url}`;
};

export const commentService = {
  /** 댓글 조회 (페이지네이션) */
  getComments: async (
    videoId: number | string,
    page: number = 0,
    size: number = 20,
  ): Promise<CommentPage> => {
    const response = await apiClient.get(`/api/videos/${videoId}/comments`, {
      params: { page, size },
    });
    const data: CommentPage = response.data.data;
    data.content = data.content.map((c) => ({
      ...c,
      profileImageUrl: normalizeProfileUrl(c.profileImageUrl),
    }));
    return data;
  },

  /** 댓글 작성 */
  createComment: async (
    videoId: number | string,
    body: string,
  ): Promise<void> => {
    await apiClient.post(`/api/videos/${videoId}/comments`, { body });
  },

  /** 댓글 수정 */
  updateComment: async (
    videoId: number | string,
    commentId: number,
    body: string,
  ): Promise<CommentDto> => {
    const response = await apiClient.patch(
      `/api/videos/${videoId}/comments/${commentId}`,
      { body },
    );
    return response.data.data;
  },

  /** 댓글 삭제 */
  deleteComment: async (
    videoId: number | string,
    commentId: number,
  ): Promise<void> => {
    await apiClient.delete(`/api/videos/${videoId}/comments/${commentId}`);
  },
};
