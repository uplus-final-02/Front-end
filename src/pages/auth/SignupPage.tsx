import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { getOAuthUrl } from "@/utils/oauth";
import AlertModal from "@/components/common/AlertModal";
import type { SocialProvider } from "@/types";

type SignupStep = "email" | "profile" | "tags";

const SignupPage: React.FC = () => {
  const { signupComplete } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>("email");
  const [tags, setTags] = useState<{ tagId: number; name: string }[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

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

  // 소셜 로그인 핸들러
  const handleSocialSignup = (provider: SocialProvider) => {
    try {
      const authUrl = getOAuthUrl(provider);
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "소셜 로그인 실패");
    }
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
      setAlertModal({
        message: "인증코드가 발송되었습니다.\n이메일을 확인해주세요.",
        type: "success",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "인증코드 발송 실패");
    } finally {
      setSendingCode(false);
    }
  };

  // STEP 1-B: 인증코드 확인 → 성공 모달 후 프로필 단계로
  const [emailVerified, setEmailVerified] = useState(false);

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError("인증코드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      setEmailVerified(true);
      setAlertModal({
        message: "이메일 인증이 완료되었습니다.",
        type: "success",
      });
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
    if (/\s/.test(nickname)) {
      setError("닉네임에 공백을 포함할 수 없습니다.");
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

  // 이메일 회원가입 폼
  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-3xl font-bold mb-4">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">회원가입</h1>
          <p className="text-sm text-gray-400">
            이메일로 가입하여 UTOPIA를 시작하세요
          </p>
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

              {/* 소셜 회원가입 구분선 */}
              {!codeSent && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-800"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-gray-900 text-gray-500">
                        또는 소셜 계정으로 가입
                      </span>
                    </div>
                  </div>

                  {/* 소셜 로그인 버튼들 */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handleSocialSignup("google")}
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

                    <button
                      type="button"
                      onClick={() => handleSocialSignup("kakao")}
                      className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] hover:bg-[#FDD835] text-[#000000] font-medium rounded-lg transition-colors"
                    >
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3zm5.907 8.06l1.47-1.424a.472.472 0 0 0-.656-.678l-1.928 1.866V9.282a.472.472 0 0 0-.944 0v2.557a.471.471 0 0 0 0 .222V13.5a.472.472 0 0 0 .944 0v-1.363l.427-.413 1.428 2.033a.472.472 0 1 0 .773-.543l-1.514-2.155zm-2.958 1.924h-1.46V9.297a.472.472 0 0 0-.943 0v4.159c0 .26.21.472.471.472h1.932a.472.472 0 1 0 0-.944zm-5.857-1.092l.696-1.707.638 1.707H9.092zm2.523.488l.002-.016a.469.469 0 0 0-.127-.32l-1.046-2.8a.69.69 0 0 0-.627-.474.696.696 0 0 0-.653.447l-1.661 4.075a.472.472 0 0 0 .874.357l.33-.813h2.07l.299.8a.472.472 0 1 0 .884-.33l-.345-.926zM8.293 9.302a.472.472 0 0 0-.471-.472H4.577a.472.472 0 1 0 0 .944h1.16v3.736a.472.472 0 0 0 .944 0V9.774h1.14c.261 0 .472-.212.472-.472z" />
                      </svg>
                      카카오로 시작하기
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSocialSignup("naver")}
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

      {alertModal && (
        <AlertModal
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => {
            setAlertModal(null);
            if (emailVerified && step === "email") {
              setEmailVerified(false);
              setStep("profile");
            }
          }}
        />
      )}
    </div>
  );
};

export default SignupPage;
