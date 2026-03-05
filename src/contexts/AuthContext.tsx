import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User } from "@/types";
import { authService } from "@/services/authService";

interface AuthContextType {
  user: User | null;
  loading: boolean; // 초기 로딩 상태 추가
  login: (email: string, password: string) => Promise<void>;
  loginWithUser: (user: User) => void; // 소셜 로그인용
  signupComplete: (
    accessToken: string,
    refreshToken: string,
    email: string,
    nickname: string,
    tagIds: number[],
  ) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  subscribe: (subscriptionType: "basic" | "premium") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // 초기 로딩 상태

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    setLoading(false); // 로딩 완료
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
  };

  const loginWithUser = (user: User) => {
    setUser(user);
  };

  const signupComplete = (
    accessToken: string,
    refreshToken: string,
    email: string,
    nickname: string,
    tagIds: number[],
  ) => {
    const newUser = authService.saveAuthData(
      accessToken,
      refreshToken,
      email,
      nickname,
      tagIds,
    );
    setUser(newUser);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates };
    localStorage.setItem("ott_current_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const subscribe = async (subscriptionType: "basic" | "premium") => {
    if (!user) return;
    const updatedUser = { ...user, subscriptionType };
    localStorage.setItem("ott_current_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithUser,
        signupComplete,
        logout,
        updateUser,
        subscribe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
