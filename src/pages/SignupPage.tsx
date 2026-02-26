import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";

type SignupMethod = "email" | "kakao" | "naver" | "google" | null;
type SignupStep = "email" | "profile" | "tags";

const SignupPage: React.FC = () => {
  const { signupComplete } = useAuth();
  const navigate = useNavigate();
  const [signupMethod, setSignupMethod] = useState<SignupMethod>(null);
  const [step, setStep] = useState<SignupStep>("email");
  const [tags, setTags] = useState<{ tagId: number; name: string }[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);

  // 폼 데이터
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // 상태
  const [codeSent, setCodeSent] = useState(false);
  const [setupToken, setSetupToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // 회원가입 방법 선택
  const handleSelectMethod = (method: SignupMethod) => {
    setSignupMethod(method);
    setError("");
  };

  // STEP 1-A: 인증코드 발송
  const handleSendCode = async () => {
    if (!email) {
      setError("이메일을 입력해주세요.");
      return;
    }
    setSendingCode(true);
    setError("");
    try {
      await authService.sendVerificationCode(email);
      setCodeSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 발송 실패");
    } finally {
      setSendingCode(false);
    }
  };

  // STEP 1-B: 인증코드 확인 → 프로필 단계로
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError("인증코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 인증코드만 확인하고 프로필 단계로 이동 (verify-code API는 비밀번호도 필요하므로 프로필 단계에서 호출)
      setStep("profile");
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증 실패");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: 비밀번호 + 닉네임 설정 → verify-code + setNickname 연속 호출
  const handleSetProfile = async () => {
    if (!password) {
      setError("비밀번호를 입력해주세요.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (!nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // verify-code 호출 (비밀번호 포함)
      const token = await authService.verifyCode(
        email,
        password,
        verificationCode,
      );
      // 닉네임 설정
      const newToken = await authService.setNickname(token, nickname);
      setSetupToken(newToken);
      // 태그 목록 로딩
      setTagsLoading(true);
      const tagList = await authService.getTags("LEVEL_0");
      setTags(tagList);
      setTagsLoading(false);
      setStep("tags");
    } catch (err) {
      setError(err instanceof Error ? err.message : "프로필 설정 실패");
    } finally {
      setLoading(false);
    }
  };

  // STEP 3: 태그 선택 → 회원가입 완료
  const handleCompleteTags = async () => {
    if (selectedTagIds.length < 3) {
      setError("최소 3개 이상의 태그를 선택해주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { accessToken, refreshToken } = await authService.completeTags(
        setupToken,
        selectedTagIds,
      );
      signupComplete(
        accessToken,
        refreshToken,
        email,
        nickname,
        selectedTagIds,
      );
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  const handleTagToggle = (tagId: number) => {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId);
      if (prev.length >= 5) return prev; // 최대 5개
      return [...prev, tagId];
    });
  };

  // 단계 표시
  const steps = [
    { key: "email", label: "이메일 인증" },
    { key: "profile", label: "계정 설정" },
    { key: "tags", label: "태그 선택" },
  ];
  const currentStepIndex = steps.findIndex((s) => s.key === step);

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

              <button
                type="button"
                onClick={() => handleSelectMethod("kakao")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-medium rounded-lg transition-colors"
              >
                카카오로 시작하기
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("naver")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#03C75A] hover:bg-[#02B350] text-white font-medium rounded-lg transition-colors"
              >
                네이버로 시작하기
              </button>

              <button
                type="button"
                onClick={() => handleSelectMethod("google")}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-100 text-gray-800 font-medium rounded-lg transition-colors border border-gray-300"
              >
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

  // 소셜 회원가입 (추후 구현)
  if (signupMethod !== "email") {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-xl mb-4">소셜 회원가입은 개발 중입니다.</p>
          <button onClick={() => setSignupMethod(null)} className="btn-primary">
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 이메일 회원가입 폼
  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-3xl font-bold mb-4">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">이메일 회원가입</h1>
          <button
            type="button"
            onClick={() => setSignupMethod(null)}
            className="text-sm text-gray-400 hover:text-primary transition-colors"
          >
            ← 다른 방법으로 가입하기
          </button>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center mb-8 gap-2">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                  i <= currentStepIndex
                    ? "bg-primary text-white"
                    : "bg-gray-700 text-gray-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm ${
                  i <= currentStepIndex ? "text-white" : "text-gray-500"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    i < currentStepIndex ? "bg-primary" : "bg-gray-700"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="bg-gray-900 rounded-lg p-8">
          {/* STEP 1: 이메일 인증 */}
          {step === "email" && (
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  이메일 *
                </label>
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setCodeSent(false);
                    }}
                    className="input-field flex-1"
                    placeholder="example@email.com"
                    disabled={codeSent}
                  />
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sendingCode || !email}
                    className="btn-primary px-4 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {sendingCode
                      ? "발송 중..."
                      : codeSent
                        ? "재발송"
                        : "인증코드 발송"}
                  </button>
                </div>
              </div>

              {codeSent && (
                <>
                  <div>
                    <label
                      htmlFor="code"
                      className="block text-sm font-medium mb-2"
                    >
                      인증코드 *
                    </label>
                    <input
                      id="code"
                      type="text"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="input-field"
                      placeholder="이메일로 받은 인증코드를 입력하세요"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      인증코드는 서버 로그에서 확인할 수 있습니다
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleVerifyCode}
                    disabled={loading || !verificationCode}
                    className="w-full btn-primary disabled:opacity-50"
                  >
                    {loading ? "확인 중..." : "다음"}
                  </button>
                </>
              )}
            </div>
          )}

          {/* STEP 2: 비밀번호 + 닉네임 */}
          {step === "profile" && (
            <div className="space-y-5">
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="최소 6자 이상"
                />
              </div>

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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="비밀번호를 다시 입력하세요"
                />
              </div>

              <div>
                <label
                  htmlFor="nickname"
                  className="block text-sm font-medium mb-2"
                >
                  닉네임 *
                </label>
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input-field"
                  placeholder="닉네임을 입력하세요"
                />
              </div>

              <button
                type="button"
                onClick={handleSetProfile}
                disabled={loading}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? "설정 중..." : "다음"}
              </button>
            </div>
          )}

          {/* STEP 3: 태그 선택 */}
          {step === "tags" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-3">
                  선호 태그 선택 * (3~5개)
                </label>
                {tagsLoading ? (
                  <div className="text-center py-4 text-gray-400">
                    태그 로딩 중...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <button
                        key={tag.tagId}
                        type="button"
                        onClick={() => handleTagToggle(tag.tagId)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          selectedTagIds.includes(tag.tagId)
                            ? "bg-primary text-white"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {selectedTagIds.length}개 선택됨
                </p>
              </div>
              <button
                type="button"
                onClick={handleCompleteTags}
                disabled={loading || selectedTagIds.length < 3}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? "가입 중..." : "회원가입 완료"}
              </button>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 bg-red-500/10 border border-red-500 text-red-500 px-4 py-3 rounded">
              {error}
            </div>
          )}

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
