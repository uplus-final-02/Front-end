import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

// API Base URL
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

// Axios 인스턴스 생성
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// 토큰 재발급 중복 방지
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

const doRefreshToken = async (): Promise<string | null> => {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const response = await axios.post(
      `${API_BASE_URL || ""}/api/auth/reissue`,
      { refreshToken },
      { headers: { "Content-Type": "application/json" } },
    );
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    localStorage.setItem("accessToken", accessToken);
    if (newRefreshToken) {
      localStorage.setItem("refreshToken", newRefreshToken);
    }
    return accessToken;
  } catch {
    // refresh token도 만료 → 로그아웃
    localStorage.clear();
    window.location.href = "/login";
    return null;
  }
};

// Request 인터셉터 - 토큰 자동 추가 (만료 시 선제적 재발급)
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // 인증 관련 요청은 토큰 처리 건너뛰기
    const url = config.url || "";
    if (
      url.includes("/api/auth/signup") ||
      url.includes("/api/auth/login") ||
      url.includes("/api/auth/reissue")
    ) {
      return config;
    }

    let token = localStorage.getItem("accessToken");

    // accessToken이 없지만 refreshToken이 있으면 재발급 시도
    if (!token && localStorage.getItem("refreshToken")) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = doRefreshToken();
      }
      const newToken = await refreshPromise;
      isRefreshing = false;
      refreshPromise = null;
      if (newToken) {
        token = newToken;
      }
    }

    if (token && config.headers) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        const now = Date.now();
        const expMs = payload.exp * 1000;

        // 만료됐거나 1분 이내 만료 예정이면 선제적으로 재발급
        if (expMs - now < 60_000) {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = doRefreshToken();
          }
          const newToken = await refreshPromise;
          isRefreshing = false;
          refreshPromise = null;

          if (newToken) {
            token = newToken;
          } else {
            return config;
          }
        }
      } catch {
        // 파싱 실패 시 토큰 제거 후 재발급 시도
        localStorage.removeItem("accessToken");
        if (localStorage.getItem("refreshToken")) {
          if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = doRefreshToken();
          }
          const newToken = await refreshPromise;
          isRefreshing = false;
          refreshPromise = null;
          if (newToken) {
            token = newToken;
          } else {
            return config;
          }
        } else {
          return config;
        }
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response 인터셉터 - 에러 처리
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // 403: 탈퇴 회원 / 권한 없음 등 → 즉시 로그아웃 처리
    if (error.response?.status === 403) {
      // refresh token도 만료 → 로그아웃
      // localStorage.clear();
      return Promise.reject(error);
    }

    // 401 에러 (토큰 만료) 처리 - request 인터셉터에서 놓친 경우 fallback
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshPromise = doRefreshToken();
        }
        const newToken = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (newToken) {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
