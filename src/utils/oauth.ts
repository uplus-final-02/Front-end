// OAuth 관련 유틸리티 함수

import { OAUTH_CONFIG, generateState } from "@/constants/oauth";
import type { SocialProvider } from "@/types";

/**
 * OAuth 인가 URL 생성
 */
export const getOAuthUrl = (provider: SocialProvider): string => {
  switch (provider) {
    case "google": {
      const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.GOOGLE.CLIENT_ID,
        redirect_uri: OAUTH_CONFIG.GOOGLE.REDIRECT_URI,
        response_type: "code",
        scope: OAUTH_CONFIG.GOOGLE.SCOPE,
      });
      return `${OAUTH_CONFIG.GOOGLE.AUTH_URL}?${params.toString()}`;
    }

    case "kakao": {
      const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.KAKAO.CLIENT_ID,
        redirect_uri: OAUTH_CONFIG.KAKAO.REDIRECT_URI,
        response_type: "code",
      });
      return `${OAUTH_CONFIG.KAKAO.AUTH_URL}?${params.toString()}`;
    }

    case "naver": {
      const state = generateState();
      sessionStorage.setItem("oauth_state", state); // CSRF 방지용 state 저장

      const params = new URLSearchParams({
        client_id: OAUTH_CONFIG.NAVER.CLIENT_ID,
        redirect_uri: OAUTH_CONFIG.NAVER.REDIRECT_URI,
        response_type: "code",
        state,
      });
      return `${OAUTH_CONFIG.NAVER.AUTH_URL}?${params.toString()}`;
    }

    default:
      throw new Error(`지원하지 않는 OAuth 제공자: ${provider}`);
  }
};

/**
 * OAuth 콜백 URL에서 code와 state 파싱
 */
export const parseOAuthCallback = (): {
  code: string | null;
  state: string | null;
  error: string | null;
} => {
  const params = new URLSearchParams(window.location.search);
  return {
    code: params.get("code"),
    state: params.get("state"),
    error: params.get("error"),
  };
};

/**
 * Naver state 검증
 */
export const validateNaverState = (receivedState: string): boolean => {
  const savedState = sessionStorage.getItem("oauth_state");
  sessionStorage.removeItem("oauth_state"); // 사용 후 삭제
  return savedState === receivedState;
};

/**
 * OAuth 제공자별 redirect URI 반환
 */
export const getRedirectUri = (provider: SocialProvider): string => {
  switch (provider) {
    case "google":
      return OAUTH_CONFIG.GOOGLE.REDIRECT_URI;
    case "kakao":
      return OAUTH_CONFIG.KAKAO.REDIRECT_URI;
    case "naver":
      return OAUTH_CONFIG.NAVER.REDIRECT_URI;
    default:
      throw new Error(`지원하지 않는 OAuth 제공자: ${provider}`);
  }
};
