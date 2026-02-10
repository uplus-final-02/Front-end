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
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    nickname: string,
    preferredTags: string[],
    isLGUPlus: boolean,
  ) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => Promise<void>;
  subscribe: (subscriptionType: "basic" | "premium") => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
  }, []);

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login(email, password);
    setUser(loggedInUser);
  };

  const signup = async (
    email: string,
    password: string,
    nickname: string,
    preferredTags: string[],
    isLGUPlus: boolean,
  ) => {
    const newUser = await authService.signup(
      email,
      password,
      nickname,
      preferredTags,
      isLGUPlus,
    );
    setUser(newUser);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    const updatedUser = await authService.updateUser(user.id, updates);
    setUser(updatedUser);
  };

  const subscribe = async (subscriptionType: "basic" | "premium") => {
    if (!user) return;
    const updatedUser = await authService.subscribe(user.id, subscriptionType);
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, signup, logout, updateUser, subscribe }}
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
