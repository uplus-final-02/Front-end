import { User } from "@/types";
import apiClient from "./apiClient";

const STORAGE_KEY = "ott_current_user";
const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const authService = {
  // ══════════════════════════════════════════════════════════════
  //  회원가입 4단계
  // ══════════════════════════════════════════════════════════════

  // STEP 1-A: 이메일 인증코드 발송
  sendVerificationCode: async (email: string): Promise<void> => {
    try {
      await apiClient.post("/api/auth/signup/email/send-code", { email });
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error("이미 가입된 이메일입니다.");
      }
      throw new Error("인증코드 발송에 실패했습니다.");
    }
  },

  // STEP 1-B: 인증코드 검증 + 비밀번호 설정 → setupToken 발급
  verifyCode: async (
    email: string,
    password: string,
    code: string,
  ): Promise<string> => {
    try {
      const response = await apiClient.post(
        "/api/auth/signup/email/verify-code",
        { email, password, code },
      );
      return response.data.data.setupToken;
    } catch (error: any) {
      if (error.response?.status === 400) {
        throw new Error("인증코드가 올바르지 않습니다.");
      }
      throw new Error("인증코드 검증에 실패했습니다.");
    }
  },

  // STEP 2: 닉네임 설정 → 새 setupToken 발급
  setNickname: async (
    setupToken: string,
    nickname: string,
  ): Promise<string> => {
    try {
      const response = await apiClient.post(
        "/api/auth/signup/profile/nickname",
        { nickname },
        { headers: { Authorization: `Bearer ${setupToken}` } },
      );
      return response.data.data.setupToken;
    } catch (error: any) {
      if (error.response?.status === 409) {
        throw new Error("이미 사용 중인 닉네임입니다.");
      }
      throw new Error("닉네임 설정에 실패했습니다.");
    }
  },

  // STEP 3: 태그 선택 → 회원가입 완료 + JWT 발급
  completeTags: async (
    setupToken: string,
    tagIds: number[],
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
      const response = await apiClient.post(
        "/api/auth/signup/profile/tags",
        { tagIds },
        { headers: { Authorization: `Bearer ${setupToken}` } },
      );
      const data = response.data.data;
      return {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      };
    } catch (error: any) {
      throw new Error("회원가입 완료에 실패했습니다.");
    }
  },

  // ══════════════════════════════════════════════════════════════
  //  로그인 / 로그아웃
  // ══════════════════════════════════════════════════════════════

  login: async (email: string, password: string): Promise<User> => {
    try {
      const response = await apiClient.post("/api/auth/login/email", {
        email,
        password,
      });
      const data = response.data.data;

      // 토큰 저장
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

      // 사용자 정보 구성 (JWT 디코딩 또는 기본값)
      const user: User = {
        id: "current",
        email,
        nickname: email.split("@")[0],
        preferredTags: [],
        subscriptionType: "basic",
        isLGUPlus: false,
        joinDate: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      return user;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      }
      throw new Error("로그인에 실패했습니다.");
    }
  },

  logout: (): void => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    // 백엔드 로그아웃 호출 (실패해도 무시)
    apiClient.post("/api/auth/logout").catch(() => {});
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  // 회원가입 완료 후 토큰 저장 + 사용자 정보 저장
  saveAuthData: (
    accessToken: string,
    refreshToken: string,
    email: string,
    nickname: string,
    _tagIds: number[],
  ): User => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const user: User = {
      id: "current",
      email,
      nickname,
      preferredTags: [],
      subscriptionType: "basic",
      isLGUPlus: false,
      joinDate: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    return user;
  },

  // 토큰 가져오기
  getAccessToken: (): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // 태그 목록 조회 (API 실패 시 하드코딩 fallback)
  getTags: async (
    section: string = "LEVEL_0",
  ): Promise<{ tagId: number; name: string }[]> => {
    try {
      const response = await apiClient.get("/api/tags", {
        params: { section },
      });
      return response.data.data;
    } catch (error) {
      console.error("태그 API 실패, fallback 사용:", error);
      return [
        { tagId: 1, name: "액션" },
        { tagId: 2, name: "로맨스" },
        { tagId: 3, name: "스릴러" },
        { tagId: 4, name: "코미디" },
        { tagId: 5, name: "SF" },
        { tagId: 6, name: "판타지" },
        { tagId: 7, name: "영화" },
        { tagId: 8, name: "TV드라마" },
        { tagId: 9, name: "예능" },
        { tagId: 10, name: "다큐" },
        { tagId: 11, name: "미스터리" },
        { tagId: 12, name: "음악" },
        { tagId: 13, name: "가족" },
        { tagId: 14, name: "역사" },
        { tagId: 15, name: "전쟁" },
        { tagId: 16, name: "스포츠" },
        { tagId: 17, name: "하이틴" },
        { tagId: 18, name: "누아르" },
        { tagId: 19, name: "무협" },
        { tagId: 20, name: "히어로" },
        { tagId: 21, name: "서바이벌" },
        { tagId: 22, name: "추리" },
        { tagId: 23, name: "법정" },
        { tagId: 24, name: "메디컬" },
        { tagId: 25, name: "공포" },
        { tagId: 26, name: "팝콘각" },
        { tagId: 27, name: "킬링타임" },
        { tagId: 28, name: "인생작" },
        { tagId: 29, name: "웃음나는" },
        { tagId: 30, name: "게임" },
      ];
    }
  },

  // 계정 삭제 (로컬 데이터 삭제)
  deleteAccount: async (_userId: string): Promise<void> => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
