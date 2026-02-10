import { User } from "@/types";
import { mockUsers } from "./mockData";

const STORAGE_KEY = "ott_current_user";

export const authService = {
  // 로그인
  login: async (email: string, password: string): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 500)); // 네트워크 지연 시뮬레이션

    const user = mockUsers.find(
      (u) => u.email === email && u.password === password,
    );
    if (!user) {
      throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    }

    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
  },

  // 회원가입
  signup: async (
    email: string,
    password: string,
    nickname: string,
    preferredTags: string[],
    isLGUPlus: boolean,
  ): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 이메일 중복 체크
    if (mockUsers.some((u) => u.email === email)) {
      throw new Error("이미 사용 중인 이메일입니다.");
    }

    // 닉네임 중복 체크
    if (mockUsers.some((u) => u.nickname === nickname)) {
      throw new Error("이미 사용 중인 닉네임입니다.");
    }

    const newUser: User = {
      id: `user${Date.now()}`,
      email,
      nickname,
      preferredTags,
      subscriptionType: isLGUPlus ? "basic" : "none",
      isLGUPlus,
      joinDate: new Date().toISOString(),
      password,
    };

    mockUsers.push(newUser);
    const { password: _, ...userWithoutPassword } = newUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
  },

  // 로그아웃
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
  },

  // 현재 사용자 가져오기
  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem(STORAGE_KEY);
    return userStr ? JSON.parse(userStr) : null;
  },

  // 사용자 정보 업데이트
  updateUser: async (userId: string, updates: Partial<User>): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const userIndex = mockUsers.findIndex((u) => u.id === userId);
    if (userIndex === -1) {
      throw new Error("사용자를 찾을 수 없습니다.");
    }

    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updates };
    const { password: _, ...userWithoutPassword } = mockUsers[userIndex];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithoutPassword));
    return userWithoutPassword;
  },

  // 구독 처리
  subscribe: async (
    userId: string,
    subscriptionType: "basic" | "premium",
  ): Promise<User> => {
    await new Promise((resolve) => setTimeout(resolve, 1000)); // 결제 시뮬레이션
    return authService.updateUser(userId, { subscriptionType });
  },

  // 회원 탈퇴
  deleteAccount: async (userId: string): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const index = mockUsers.findIndex((u) => u.id === userId);
    if (index !== -1) {
      mockUsers.splice(index, 1);
    }
    localStorage.removeItem(STORAGE_KEY);
  },
};
