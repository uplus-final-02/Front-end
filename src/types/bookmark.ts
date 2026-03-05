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
  videoId: number;
  contentId: number;
  contentTitle: string;
  thumbnailUrl: string;
  duration: number;
  episodeId: number | null;
  episodeTitle: string | null;
  episodeNo: number | null;
  lastPosition: number;
  progressPercent: number;
}

export interface BookmarkPlaylistResponse {
  playlist: PlaylistItem[];
  totalCount: number;
}
