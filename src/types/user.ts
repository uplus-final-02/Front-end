// 사용자 관련 타입

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

export interface WatchStats {
  userId: string;
  tagStats: { [tag: string]: number };
  totalWatchTime: number;
  totalContents: number;
}
