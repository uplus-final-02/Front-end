// 인증 관련 타입

export type AuthProvider = "EMAIL" | "GOOGLE" | "KAKAO" | "NAVER";
export type SocialProvider = "google" | "kakao" | "naver";

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

// 소셜 로그인 요청/응답
export interface SocialLoginRequest {
  code: string;
  redirectUri: string;
  state?: string; // Naver만 필수
}

export interface SocialLoginResponse {
  isNewUser: boolean;
  // 신규 유저
  setupToken?: string;
  setupTokenTtlSeconds?: number;
  // 기존 유저
  tokenType?: string;
  accessToken?: string;
  accessTokenTtlSeconds?: number;
  refreshToken?: string;
  refreshTokenTtlSeconds?: number;
}
