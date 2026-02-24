import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { SYSTEM_TAGS } from "@/services/mockData";
import { CheckCircle, XCircle } from "lucide-react";

type SignupMethod = "email" | "kakao" | "naver" | "google" | null;

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [signupMethod, setSignupMethod] = useState<SignupMethod>(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    nickname: "",
    isLGUPlus: false,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 중복 확인 상태
  const [emailCheck, setEmailCheck] = useState<{
    checked: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({ checked: false, isAvailable: null, message: "" });

  const [nicknameCheck, setNicknameCheck] = useState<{
    checked: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({ checked: false, isAvailable: null, message: "" });

  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  // 회원가입 방법 선택
  const handleSelectMethod = (method: SignupMethod) => {
    setSignupMethod(method);
    setError("");
  };

  // 이메일 중복 확인 버튼 클릭
  const handleCheckEmail = async () => {
    if (!formData.email) {
      setEmailCheck({
        checked: true,
        isAvailable: false,
        message: "이메일을 입력해주세요.",
      });
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await authService.checkAvailability(
        "email",
        formData.email,
      );
      setEmailCheck({
        checked: true,
        isAvailable: result.isAvailable,
        message: result.message,
      });
    } catch (error) {
      setEmailCheck({
        checked: true,
        isAvailable: false,
        message: "확인 중 오류가 발생했습니다.",
      });
    } finally {
      setCheckingEmail(false);
    }
  };

  // 닉네임 중복 확인 버튼 클릭
  const handleCheckNickname = async () => {
    if (!formData.nickname) {
      setNicknameCheck({
        checked: true,
        isAvailable: false,
        message: "닉네임을 입력해주세요.",
      });
      return;
    }

    setCheckingNickname(true);
    try {
      const result = await authService.checkAvailability(
        "nickname",
        formData.nickname,
      );
      setNicknameCheck({
        checked: true,
        isAvailable: result.isAvailable,
        message: result.message,
      });
    } catch (error) {
      setNicknameCheck({
        checked: true,
        isAvailable: false,
        message: "확인 중 오류가 발생했습니다.",
      });
    } finally {
      setCheckingNickname(false);
    }
  };

  // 이메일 변경 시 중복 확인 초기화
  const handleEmailChange = (value: string) => {
    setFormData({ ...formData, email: value });
    setEmailCheck({ checked: false, isAvailable: null, message: "" });
  };

  // 닉네임 변경 시 중복 확인 초기화
  const handleNicknameChange = (value: string) => {
    setFormData({ ...formData, nickname: value });
    setNicknameCheck({ checked: false, isAvailable: null, message: "" });
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 닉네임 중복 확인 검증
    if (!nicknameCheck.checked || !nicknameCheck.isAvailable) {
      setError("닉네임 중복 확인을 완료해주세요.");
      return;
    }

    // 이메일 회원가입인 경우 추가 검증
    if (signupMethod === "email") {
      if (!emailCheck.checked || !emailCheck.isAvailable) {
        setError("이메일 중복 확인을 완료해주세요.");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("비밀번호가 일치하지 않습니다.");
        return;
      }

      if (formData.password.length < 6) {
        setError("비밀번호는 최소 6자 이상이어야 합니다.");
        return;
      }
    }

    if (selectedTags.length === 0) {
      setError("최소 1개 이상의 선호 태그를 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      if (signupMethod === "email") {
        await signup(
          formData.email,
          formData.password,
          formData.nickname,
          selectedTags,
          formData.isLGUPlus,
        );
      } else {
        // 소셜 회원가입 (추후 구현)
        alert(`${signupMethod} 소셜 회원가입은 개발 중입니다.`);
        setLoading(false);
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 방법 선택 화면
  if (!signupMethod) {
    return (
      <div className="bg-dark flex justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <Link to="/" className="inline-block text-3xl font-bold">
              <span className="text-primary">U</span>
              <span className="text-white">TOPIA</span>
            </Link>
            <p className="text-sm text-gray-400 mt-2">
              회원가입 방법을 선택하세요
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-8">
            <div className="space-y-3">
              {/* 이메일 회원가입 */}
              <button
                type="button"
                onClick={() => handleSelectMethod("email")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                이메일로 회원가입
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-500">
                    소셜 계정으로 회원가입
                  </span>
                </div>
              </div>

              {/* 카카오 회원가입 */}
              <button
                type="button"
                onClick={() => handleSelectMethod("kakao")}
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

              {/* 네이버 회원가입 */}
              <button
                type="button"
                onClick={() => handleSelectMethod("naver")}
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

              {/* 구글 회원가입 */}
              <button
                type="button"
                onClick={() => handleSelectMethod("google")}
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
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">
                이미 계정이 있으신가요?{" "}
                <Link to="/login" className="text-primary hover:underline">
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 회원가입 폼 화면
  const isSocialSignup = signupMethod !== "email";
  const methodName =
    signupMethod === "kakao"
      ? "카카오"
      : signupMethod === "naver"
        ? "네이버"
        : signupMethod === "google"
          ? "구글"
          : "이메일";

  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-3xl font-bold mb-4">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">{methodName} 회원가입</h1>
          <p className="text-gray-400">OTT 플랫폼에 오신 것을 환영합니다</p>
          <button
            type="button"
            onClick={() => setSignupMethod(null)}
            className="mt-4 text-sm text-gray-400 hover:text-primary transition-colors"
          >
            ← 다른 방법으로 가입하기
          </button>
        </div>

        <div className="bg-gray-900 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 회원가입인 경우에만 표시 */}
            {!isSocialSignup && (
              <>
                {/* 이메일 */}
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-2"
                  >
                    이메일 *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleEmailChange(e.target.value)}
                        required
                        className="input-field w-full"
                        placeholder="example@email.com"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCheckEmail}
                      disabled={checkingEmail || !formData.email}
                      className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkingEmail ? "확인 중..." : "중복 확인"}
                    </button>
                  </div>
                  {emailCheck.checked && (
                    <div className="flex items-center gap-2 mt-2">
                      {emailCheck.isAvailable ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <p
                        className={`text-sm ${
                          emailCheck.isAvailable
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {emailCheck.message}
                      </p>
                    </div>
                  )}
                </div>

                {/* 비밀번호 */}
                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-2"
                  >
                    비밀번호 *
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                    className="input-field"
                    placeholder="최소 6자 이상"
                  />
                </div>

                {/* 비밀번호 확인 */}
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium mb-2"
                  >
                    비밀번호 확인 *
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    className="input-field"
                    placeholder="비밀번호를 다시 입력하세요"
                  />
                </div>
              </>
            )}

            {/* 닉네임 - 모든 회원가입 방법에 공통 */}
            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium mb-2"
              >
                닉네임 *
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <input
                    id="nickname"
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleNicknameChange(e.target.value)}
                    required
                    className="input-field w-full"
                    placeholder="닉네임을 입력하세요"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={checkingNickname || !formData.nickname}
                  className="btn-secondary whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkingNickname ? "확인 중..." : "중복 확인"}
                </button>
              </div>
              {nicknameCheck.checked && (
                <div className="flex items-center gap-2 mt-2">
                  {nicknameCheck.isAvailable ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <p
                    className={`text-sm ${
                      nicknameCheck.isAvailable
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {nicknameCheck.message}
                  </p>
                </div>
              )}
            </div>

            {/* 선호 태그 - 모든 회원가입 방법에 공통 */}
            <div>
              <label className="block text-sm font-medium mb-3">
                선호 태그 선택 * (최소 1개)
              </label>
              <div className="flex flex-wrap gap-2">
                {SYSTEM_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* LG U+ 회원 - 모든 회원가입 방법에 공통 */}
            <div className="flex items-center">
              <input
                id="isLGUPlus"
                type="checkbox"
                checked={formData.isLGUPlus}
                onChange={(e) =>
                  setFormData({ ...formData, isLGUPlus: e.target.checked })
                }
                className="w-4 h-4 text-primary bg-gray-800 border-gray-700 rounded focus:ring-primary"
              />
              <label htmlFor="isLGUPlus" className="ml-2 text-sm">
                LG U+ 회원입니다 (무료 구독 혜택)
              </label>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-400">
              이미 계정이 있으신가요?{" "}
              <Link to="/login" className="text-primary hover:underline">
                로그인
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
