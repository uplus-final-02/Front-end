import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getOAuthUrl } from "@/utils/oauth";
import type { SocialProvider } from "@/types";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // 잠금 타이머
  React.useEffect(() => {
    if (!locked || lockTimer <= 0) return;
    const interval = setInterval(() => {
      setLockTimer((prev) => {
        if (prev <= 1) {
          setLocked(false);
          setFailCount(0);
          setError("");
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [locked, lockTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) return;
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      setFailCount(0);
      navigate("/");
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "로그인에 실패했습니다.";

      // 429 = 계정 잠금
      if (msg.includes("시도 횟수를 초과") || msg.includes("분 후")) {
        setLocked(true);
        setLockTimer(15 * 60); // 15분
        setFailCount(5);
        setError(msg);
      } else if (msg.includes("이메일 또는 비밀번호")) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 5) {
          setLocked(true);
          setLockTimer(15 * 60);
          setError(
            "로그인 시도 횟수를 초과했습니다. 15분 후 다시 시도해주세요.",
          );
        } else {
          setError(`이메일 또는 비밀번호가 올바르지 않습니다. (${newCount}/5)`);
        }
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider: SocialProvider) => {
    try {
      const authUrl = getOAuthUrl(provider);
      window.location.href = authUrl;
    } catch (error) {
      console.error("소셜 로그인 URL 생성 실패:", error);
      setError("소셜 로그인을 시작할 수 없습니다.");
    }
  };

  return (
    <div className="bg-dark flex justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block text-3xl font-bold">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
          </Link>
          <p className="text-sm text-gray-400 mt-2">
            로그인하여 콘텐츠를 즐기세요
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                이메일
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className={`px-4 py-3 rounded text-sm ${
                  locked
                    ? "bg-yellow-500/10 border border-yellow-500 text-yellow-400"
                    : "bg-red-500/10 border border-red-500 text-red-500"
                }`}
              >
                {error}
                {locked && lockTimer > 0 && (
                  <p className="mt-1 text-xs">
                    남은 시간: {Math.floor(lockTimer / 60)}분 {lockTimer % 60}초
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || locked}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {locked ? "계정 잠금 중" : loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          {/* 소셜 로그인 */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-500">
                  소셜 로그인
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {/* 구글 로그인 */}
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors border border-gray-300"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                구글로 시작하기
              </button>

              {/* 카카오 로그인 */}
              <button
                type="button"
                onClick={() => handleSocialLogin("kakao")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 3C6.5 3 2 6.6 2 11c0 2.8 1.9 5.3 4.7 6.7-.2.8-.7 2.8-.8 3.2-.1.5.2.5.4.4.3-.1 3.1-2.1 3.6-2.5.7.1 1.4.2 2.1.2 5.5 0 10-3.6 10-8S17.5 3 12 3z" />
                </svg>
                카카오로 시작하기
              </button>

              {/* 네이버 로그인 */}
              <button
                type="button"
                onClick={() => handleSocialLogin("naver")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#03C75A] hover:bg-[#02B350] text-white font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M16.273 12.845L7.376 0H0v24h7.726V11.156L16.624 24H24V0h-7.727v12.845z" />
                </svg>
                네이버로 시작하기
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              계정이 없으신가요?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
