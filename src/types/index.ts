// 사용자 타입
export type SubscriptionType = "none" | "basic" | "premium";

export interface User {
  id: string;
  email: string;
  nickname: string;
  preferredTags: string[];
  subscriptionType: SubscriptionType;
  isLGUPlus: boolean;
  joinDate: string;
  password?: string;
}

// 콘텐츠 타입
export type ContentType = "original" | "creator";
export type ContentStatus =
  | "uploading"
  | "processing"
  | "published"
  | "private";

export interface Content {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number; // 초 단위
  tags: string[];
  type: ContentType;
  status: ContentStatus;
  uploaderId: string;
  uploaderName: string;
  uploadDate: string;
  viewCount: number;
  bookmarkCount: number;
  isOriginal: boolean;
  isSeries: boolean; // 시리즈 여부
  episodes?: Episode[];
}

// 에피소드 (시리즈용)
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

// 시청 이력
export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  episodeId?: string;
  lastPosition: number; // 초 단위
  watchedAt: string;
  completed: boolean;
}

// 찜하기
export interface Bookmark {
  id: string;
  userId: string;
  contentId: string;
  createdAt: string;
}

// 댓글
export interface Comment {
  id: string;
  contentId: string;
  episodeId?: string; // 에피소드별 댓글
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

// 시청 통계
export interface WatchStats {
  userId: string;
  tagStats: { [tag: string]: number };
  totalWatchTime: number;
  totalContents: number;
}
