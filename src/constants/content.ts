// 콘텐츠 관련 상수

export const CONTENT_CONSTANTS = {
  // 페이지네이션
  ITEMS_PER_PAGE: 15,
  INFINITE_SCROLL_THRESHOLD: 0.8,

  // 접근 레벨
  ACCESS_LEVELS: {
    ALL: "전체",
    FREE: "무료",
    BASIC: "베이직",
    PREMIUM: "프리미엄",
  },

  // 업로더 타입
  UPLOADER_TYPES: {
    ORIGINAL: "오리지널",
    CREATOR: "크리에이터",
  },

  // 비디오
  DEFAULT_VIDEO_QUALITY: "1080p",
  SUPPORTED_QUALITIES: ["360p", "480p", "720p", "1080p", "4K"],
} as const;
