import { User } from "@/types";
import apiClient from "./apiClient";

const STORAGE_KEY = "ott_current_user";
const TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export type WithdrawalReason = "PRICE" | "CONTENT" | "UX" | "OTHER";

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

      // 프로필 API 호출하여 사용자 정보 가져오기
      try {
        // JWT에서 userId 추출
        let userId = 1;
        try {
          const base64Url = data.accessToken.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join(""),
          );
          const payload = JSON.parse(jsonPayload);
          userId = parseInt(payload.sub) || 1;
        } catch (error) {
          console.error("JWT 디코딩 실패:", error);
        }

        const profileResponse = await apiClient.get("/api/profile/mypage", {
          params: { userId },
        });
        const profile = profileResponse.data.data;

        const user: User = {
          id: profile.userId.toString(),
          email: profile.email,
          nickname: profile.nickname,
          profileImageUrl: profile.profileImageUrl || null,
          preferredTags: profile.preferredTags.map((tag: any) => tag.name),
          subscriptionType:
            profile.subscriptionStatus === "SUBSCRIBED" ? "basic" : "none",
          isLGUPlus: profile.isUPlusMember || false,
          paid: profile.subscriptionStatus === "SUBSCRIBED",
          joinDate: profile.createdAt,
          role: (() => {
            try {
              const p = JSON.parse(atob(data.accessToken.split(".")[1]));
              return p.role || "USER";
            } catch {
              return "USER";
            }
          })(),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
      } catch (profileError) {
        console.error("프로필 조회 실패:", profileError);
        // 프로필 조회 실패 시 기본 정보로 저장
        const user: User = {
          id: "current",
          email,
          nickname: email.split("@")[0],
          preferredTags: [],
          subscriptionType: "none",
          isLGUPlus: false,
          paid: false,
          joinDate: new Date().toISOString(),
          role: (() => {
            try {
              const p = JSON.parse(atob(data.accessToken.split(".")[1]));
              return p.role || "USER";
            } catch {
              return "USER";
            }
          })(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
      }
    } catch (error: any) {
      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 401) {
        throw new Error(
          serverMessage || "이메일 또는 비밀번호가 올바르지 않습니다.",
        );
      }
      if (status === 429) {
        throw new Error(
          error.response?.data?.message ||
            "로그인 시도 횟수를 초과했습니다. 잠시 후 다시 시도해주세요.",
        );
      }
      if (status === 409) {
        throw new Error(
          "이미 로그인 처리 중입니다. 잠시 후 다시 시도해주세요.",
        );
      }
      if (status === 401) {
        throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
      }

      throw new Error(serverMessage || "로그인에 실패했습니다.");
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
    tagIds: number[],
  ): User => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);

    const user: User = {
      id: "current",
      email,
      nickname,
      preferredTags: tagIds.map((id) => id.toString()), // tagIds를 문자열 배열로 변환
      subscriptionType: "none",
      isLGUPlus: false,
      paid: false,
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

  // 회원 탈퇴
  withdraw: async (data: { reason: WithdrawalReason }): Promise<void> => {
    await apiClient.delete("/api/users/me", {
      data,
    });
  },

  // ══════════════════════════════════════════════════════════════
  //  소셜 로그인
  // ══════════════════════════════════════════════════════════════

  /**
   * 소셜 로그인 (Google, Kakao, Naver)
   * @returns isNewUser가 true면 setupToken 반환, false면 JWT 반환
   */
  socialLogin: async (
    provider: "google" | "kakao" | "naver",
    code: string,
    redirectUri: string,
    state?: string,
  ): Promise<{
    isNewUser: boolean;
    setupToken?: string;
    user?: User;
  }> => {
    try {
      const response = await apiClient.post(`/api/auth/login/${provider}`, {
        code,
        redirectUri,
        state,
      });

      const data = response.data.data;

      if (data.isNewUser) {
        // 신규 유저 → setupToken 반환
        return {
          isNewUser: true,
          setupToken: data.setupToken,
        };
      } else {
        // 기존 유저 → JWT 저장 후 로그인 완료
        localStorage.setItem(TOKEN_KEY, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

        // JWT 디코딩 + 프로필 API로 구독 상태 포함한 사용자 정보 구성
        try {
          const base64Url = data.accessToken.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split("")
              .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
              .join(""),
          );
          const payload = JSON.parse(jsonPayload);
          console.log("JWT 페이로드:", payload); // 디버깅용

          const userId = parseInt(payload.sub) || 1;

          // 프로필 API 호출하여 구독 상태 포함한 정보 가져오기
          let subscriptionType: "none" | "basic" | "premium" = "none";
          let isLGUPlus = false;
          let paid = false;
          let nickname = payload.nickname || "사용자";
          let preferredTags: string[] = [];
          let profileImageUrl: string | null = null;
          try {
            const profileResponse = await apiClient.get("/api/profile/mypage", {
              params: { userId },
            });
            const profile = profileResponse.data.data;
            subscriptionType =
              profile.subscriptionStatus === "SUBSCRIBED" ? "basic" : "none";
            isLGUPlus = profile.isUPlusMember || false;
            paid = profile.subscriptionStatus === "SUBSCRIBED";
            nickname = profile.nickname || nickname;
            preferredTags =
              profile.preferredTags?.map((tag: any) => tag.name) || [];
            profileImageUrl = profile.profileImageUrl || null;
          } catch (profileError) {
            console.error("소셜 로그인 프로필 조회 실패:", profileError);
          }

          const user: User = {
            id: payload.sub || "current",
            email: payload.email || "",
            nickname,
            profileImageUrl,
            preferredTags,
            subscriptionType,
            isLGUPlus,
            paid,
            joinDate: new Date().toISOString(),
            role: payload.role || "USER",
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

          return {
            isNewUser: false,
            user,
          };
        } catch (decodeError) {
          console.error("JWT 디코딩 실패:", decodeError);
          // JWT 디코딩 실패 시 기본값 사용
          const user: User = {
            id: "current",
            email: "",
            nickname: "사용자",
            preferredTags: [],
            subscriptionType: "none",
            isLGUPlus: false,
            paid: false,
            joinDate: new Date().toISOString(),
            role: "USER",
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

          return {
            isNewUser: false,
            user,
          };
        }
      }
    } catch (error: any) {
      console.error("소셜 로그인 실패:", error);
      throw new Error(
        error.response?.data?.message || "소셜 로그인에 실패했습니다.",
      );
    }
  },
};
