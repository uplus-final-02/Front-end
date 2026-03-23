import axios from "axios";

type ApiErrorBody = {
  status?: number;
  success?: boolean;
  code?: string;
  message?: string;
  error?: string;
  data?: unknown;
};

export interface ApiErrorInfo {
  status?: number;
  code?: string;
  message: string;
  isAdminApi: boolean;
}

const DEFAULT_SERVER_ERROR_MESSAGE =
  "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
const DEFAULT_SERVICE_UNAVAILABLE_MESSAGE =
  "일시적으로 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.";

export const getApiErrorInfo = (
  error: unknown,
  fallback = "오류가 발생했습니다.",
): ApiErrorInfo => {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        message: "네트워크 연결을 확인해주세요.",
        isAdminApi: false,
      };
    }

    const body = (error.response.data ?? {}) as ApiErrorBody;
    const status = error.response.status ?? body.status;
    const code = body.code;
    const rawMessage = body.message || body.error;
    const isAdminApi =
      typeof body.success === "boolean" || typeof body.code === "string";

    if (isAdminApi) {
      if (code === "INTERNAL_ERROR" || status === 500 || status === 502) {
        return {
          status,
          code,
          message: DEFAULT_SERVER_ERROR_MESSAGE,
          isAdminApi: true,
        };
      }

      if (code === "STORAGE_UNAVAILABLE" || status === 503) {
        return {
          status,
          code,
          message: rawMessage || DEFAULT_SERVICE_UNAVAILABLE_MESSAGE,
          isAdminApi: true,
        };
      }

      return {
        status,
        code,
        message: rawMessage || fallback,
        isAdminApi: true,
      };
    }

    if (status === 500 || status === 502) {
      return {
        status,
        message: DEFAULT_SERVER_ERROR_MESSAGE,
        isAdminApi: false,
      };
    }

    if (status === 503) {
      return {
        status,
        message: rawMessage || DEFAULT_SERVICE_UNAVAILABLE_MESSAGE,
        isAdminApi: false,
      };
    }

    return {
      status,
      message: rawMessage || fallback,
      isAdminApi: false,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message || fallback,
      isAdminApi: false,
    };
  }

  return {
    message: fallback,
    isAdminApi: false,
  };
};

export const getErrorMessage = (
  error: unknown,
  fallback = "오류가 발생했습니다.",
): string => {
  return getApiErrorInfo(error, fallback).message;
};
