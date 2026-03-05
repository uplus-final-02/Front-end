import apiClient from "./apiClient";
import type {
  Profile,
  PresignedUrlResponse,
  ProfileImageUpdateRequest,
} from "@/types/profile";

export const profileService = {
  /**
   * 내 프로필 조회
   */
  getMyProfile: async (): Promise<Profile> => {
    // JWT에서 userId 추출
    const token = localStorage.getItem("accessToken");
    let userId = 1; // 기본값

    if (token) {
      try {
        const base64Url = token.split(".")[1];
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
    }

    const response = await apiClient.get("/api/profile/mypage", {
      params: { userId },
    });
    return response.data.data;
  },

  /**
   * 닉네임 변경
   */
  updateNickname: async (userId: number, nickname: string): Promise<void> => {
    await apiClient.patch("/api/users/nickname", null, {
      params: { userId, nickname },
    });
  },

  /**
   * 프로필 이미지 업로드 URL 발급
   */
  getPresignedUrl: async (extension: string): Promise<PresignedUrlResponse> => {
    const response = await apiClient.get("/api/profile/image/presigned-url", {
      params: { extension },
    });
    return response.data.data;
  },

  /**
   * 프로필 이미지 S3 업로드
   */
  uploadImageToS3: async (
    presignedUrl: string,
    file: File,
    contentType: string,
  ): Promise<void> => {
    await fetch(presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });
  },

  /**
   * 프로필 이미지 변경 (objectKey 저장)
   */
  updateProfileImage: async (
    request: ProfileImageUpdateRequest,
  ): Promise<Profile> => {
    const response = await apiClient.patch("/api/profile/image", request);
    return response.data.data;
  },
};
