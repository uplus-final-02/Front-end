// 프로필 관련 타입

export interface ProfileTag {
  tagId: number;
  name: string;
}

export interface Profile {
  userId: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  subscriptionStatus: "SUBSCRIBED" | "NONE";
  isUPlusMember: boolean;
  preferredTags: ProfileTag[];
  createdAt: string;
  lastNicknameChangedAt: string | null;
}

export interface PresignedUrlResponse {
  uploadUrl: string;
  objectKey: string;
}

export interface NicknameUpdateRequest {
  nickname: string;
}

export interface ProfileImageUpdateRequest {
  objectKey: string;
}
