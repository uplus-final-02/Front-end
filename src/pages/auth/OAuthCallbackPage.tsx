import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { authService } from "@/services/authService";
import { useAuth } from "@/contexts/AuthContext";
import {
  parseOAuthCallback,
  validateNaverState,
  getRedirectUri,
} from "@/utils/oauth";
import type { SocialProvider } from "@/types";

const OAuthCallbackPage: React.FC = () => {
  const { provider } = useParams<{ provider: SocialProvider }>();
  const navigate = useNavigate();
  const { loginWithUser } = useAuth();
  const [error, setError] = useState<string>("");
  const hasRun = React.useRef(false); // 중복 실행 방지

  useEffect(() => {
    // React Strict Mode에서 2번 실행 방지
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      if (!provider) {
        setError("잘못된 접근입니다.");
        return;
      }

      const { code, state, error: oauthError } = parseOAuthCallback();

      // OAuth 에러 체크
      if (oauthError) {
        setError(`로그인 취소: ${oauthError}`);
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // code 없음
      if (!code) {
        setError("인가 코드를 받지 못했습니다.");
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      // Naver state 검증
      if (provider === "naver") {
        if (!state || !validateNaverState(state)) {
          setError("보안 검증에 실패했습니다. (state 불일치)");
          setTimeout(() => navigate("/login"), 2000);
          return;
        }
      }

      try {
        const redirectUri = getRedirectUri(provider);
        const result = await authService.socialLogin(
          provider,
          code,
          redirectUri,
          state || undefined,
        );

        console.log("소셜 로그인 응답:", result); // 디버깅용

        if (result.isNewUser) {
          // 신규 유저 → 소셜 계정 설정 페이지로
          console.log("신규 유저 - /social-setup으로 이동");
          navigate("/social-setup", {
            state: {
              setupToken: result.setupToken,
              provider,
            },
          });
        } else {
          // 기존 유저 → 로그인 완료
          console.log("기존 유저 - 로그인 완료");
          if (result.user) {
            loginWithUser(result.user);
          }
          navigate("/");
        }
      } catch (err) {
        console.error("소셜 로그인 처리 실패:", err);
        const errorMessage =
          err instanceof Error ? err.message : "로그인 처리에 실패했습니다.";
        setError(errorMessage);
        // 에러 발생 시 로그인 페이지로 이동하지 않고 에러 표시만
        // setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
  }, [provider, navigate, loginWithUser]);

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center">
      <div className="text-center">
        {error ? (
          <>
            <div className="text-red-500 text-xl mb-4">❌ {error}</div>
            <p className="text-gray-400">로그인 페이지로 이동합니다...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-xl text-white">로그인 처리 중...</p>
            <p className="text-gray-400 mt-2">잠시만 기다려주세요.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallbackPage;
