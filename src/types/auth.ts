// 인증 관련 타입

export type AuthProvider = "EMAIL" | "GOOGLE" | "KAKAO" | "NAVER";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: number;
    nickname: string;
    email?: string;
  };
}

export interface SignupRequest {
  email: string;
  password: string;
  nickname: string;
  tagIds: number[];
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface Tag {
  tagId: number;
  name: string;
  section?: string;
}
