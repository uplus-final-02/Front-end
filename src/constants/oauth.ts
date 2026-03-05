// OAuth 관련 상수

export const OAUTH_CONFIG = {
  GOOGLE: {
    CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    AUTH_URL: "https://accounts.google.com/o/oauth2/v2/auth",
    REDIRECT_URI: `${window.location.origin}/oauth/callback/google`,
    SCOPE: "email profile",
  },
  KAKAO: {
    CLIENT_ID: import.meta.env.VITE_KAKAO_CLIENT_ID,
    AUTH_URL: "https://kauth.kakao.com/oauth/authorize",
    REDIRECT_URI: `${window.location.origin}/oauth/callback/kakao`,
  },
  NAVER: {
    CLIENT_ID: import.meta.env.VITE_NAVER_CLIENT_ID,
    AUTH_URL: "https://nid.naver.com/oauth2.0/authorize",
    REDIRECT_URI: `${window.location.origin}/oauth/callback/naver`,
  },
} as const;

/**
 * 랜덤 state 문자열 생성 (CSRF 방지)
 */
export const generateState = (): string => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};
