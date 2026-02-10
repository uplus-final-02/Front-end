import { Content, User, WatchHistory, Bookmark, Comment } from "@/types";

// 시스템 태그
export const SYSTEM_TAGS = [
  "액션",
  "코미디",
  "드라마",
  "스릴러",
  "로맨스",
  "공포",
  "SF",
  "다큐멘터리",
  "애니메이션",
  "뮤지컬",
];

// 목 사용자 데이터
export const mockUsers: User[] = [
  {
    id: "user1",
    email: "test@example.com",
    nickname: "테스트유저",
    preferredTags: ["액션", "드라마"],
    subscriptionType: "basic",
    isLGUPlus: false,
    joinDate: "2024-01-01",
    password: "password123",
  },
  {
    id: "user2",
    email: "lgu@example.com",
    nickname: "LG유플러스",
    preferredTags: ["코미디", "로맨스"],
    subscriptionType: "basic",
    isLGUPlus: true,
    joinDate: "2024-01-15",
    password: "password123",
  },
];

// 목 콘텐츠 데이터 (50개 샘플)
export const mockContents: Content[] = Array.from({ length: 50 }, (_, i) => {
  const isSeries = i % 5 === 0; // 10개의 시리즈 콘텐츠
  const content: Content = {
    id: `content${i + 1}`,
    title: isSeries ? `시리즈 ${Math.floor(i / 5) + 1}` : `콘텐츠 ${i + 1}`,
    description: isSeries
      ? `흥미진진한 시리즈입니다. 여러 에피소드로 구성된 이야기를 즐겨보세요.`
      : `이것은 ${i + 1}번 콘텐츠입니다. 짧은 러닝타임의 흥미진진한 이야기를 담고 있습니다.`,
    thumbnailUrl: `https://picsum.photos/seed/${i + 1}/400/225`,
    videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    duration: Math.floor(Math.random() * 240) + 60, // 1-5분
    tags: [
      SYSTEM_TAGS[i % SYSTEM_TAGS.length],
      SYSTEM_TAGS[(i + 1) % SYSTEM_TAGS.length],
    ],
    type: i % 3 === 0 ? "original" : "creator",
    status: "published",
    uploaderId: i % 2 === 0 ? "admin" : "user1",
    uploaderName: i % 2 === 0 ? "관리자" : "크리에이터",
    uploadDate: new Date(2024, 0, (i % 28) + 1).toISOString(),
    viewCount: Math.floor(Math.random() * 10000),
    bookmarkCount: Math.floor(Math.random() * 1000),
    isOriginal: i % 3 === 0,
    isSeries,
  };

  // 시리즈인 경우 에피소드 추가
  if (isSeries) {
    const episodeCount = Math.floor(Math.random() * 5) + 3; // 3-7개 에피소드
    content.episodes = Array.from(
      { length: episodeCount },
      (_, episodeIndex) => ({
        id: `episode${i + 1}-${episodeIndex + 1}`,
        contentId: content.id,
        episodeNumber: episodeIndex + 1,
        title: `${episodeIndex + 1}화: ${["시작", "전개", "위기", "절정", "결말", "반전", "대단원"][episodeIndex] || `에피소드 ${episodeIndex + 1}`}`,
        description: `${episodeIndex + 1}화의 흥미진진한 이야기가 펼쳐집니다. 놓치지 마세요!`,
        thumbnailUrl: `https://picsum.photos/seed/${i + 1}-${episodeIndex + 1}/400/225`,
        videoUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
        duration: Math.floor(Math.random() * 240) + 60,
        viewCount: Math.floor(Math.random() * 5000),
      }),
    );
  }

  return content;
});

// 시청 이력
export let mockWatchHistory: WatchHistory[] = [];

// 찜하기
export let mockBookmarks: Bookmark[] = [];

// 댓글
export let mockComments: Comment[] = [];
