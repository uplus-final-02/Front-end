// 북마크(찜) 관련 타입

export interface BookmarkItem {
  bookmarkId: number;
  contentId: number;
  title: string;
  thumbnailUrl: string;
  contentType: "SERIES" | "SINGLE";
  category: string; // 카테고리 (전체, 액션 등)
  bookmarkedAt: string;
  isDeleted: boolean;
}

export interface BookmarkListResponse {
  bookmarks: BookmarkItem[];
  nextCursor: string | null;
  hasNext: boolean;
  totalCount: number;
}

export interface PlaylistItem {
  order: number;
  contentId: number;
  episodeId: number | null;
  title: string;
  episodeTitle: string | null;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  lastPosition: number;
  progressPercent: number;
}

export interface BookmarkPlaylistResponse {
  playlist: PlaylistItem[];
  totalCount: number;
}
