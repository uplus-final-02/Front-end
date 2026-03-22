// 콘텐츠 관련 타입

export type ContentType = "original" | "creator" | "movie" | "series";
export type ContentStatus =
  | "uploading"
  | "processing"
  | "published"
  | "private";
export type AccessLevel = "FREE" | "BASIC" | "PREMIUM";
export type UploaderType = "ORIGINAL" | "CREATOR";

export interface ContentTag {
  id: bigint;
  name: string;
}

export interface Content {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  duration?: number | string; // 초 단위 또는 문자열
  tags: string[];
  type?: ContentType;
  status?: ContentStatus;
  uploaderId?: string;
  uploaderName?: string;
  uploadDate?: string;
  viewCount?: number;
  bookmarkCount?: number;
  isOriginal?: boolean;
  isSeries?: boolean; // 시리즈 여부
  episodes?: Episode[];
  // 백엔드 API 응답 필드
  accessLevel?: AccessLevel;
  category?: string;
  rating?: number;
  year?: number;
  // 인기 차트 필드
  rank?: number;
  trendingScore?: number;
  // 상세 정보 (description 객체에서 추출)
  director?: string;
  actor?: string;
  releaseDate?: string;
  // 검색 결과 필드
  highlightTitle?: string | null;
  highlightDescription?: string | null;
  matchType?: string;
  // 북마크에서 삭제된 콘텐츠 표시용
  isDeleted?: boolean;
}

export interface Episode {
  id: string;
  contentId: string;
  episodeNumber: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  viewCount: number;
}

export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  episodeId?: string;
  lastPosition: number; // 초 단위
  watchedAt: string;
  completed: boolean;
}

export interface Bookmark {
  id: string;
  userId: string;
  contentId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  contentId: string;
  episodeId?: string; // 에피소드별 댓글
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export interface ContentListParams {
  accessLevel?: AccessLevel;
  uploaderType?: UploaderType;
  page?: number;
  size?: number;
  sort?: string;
}
