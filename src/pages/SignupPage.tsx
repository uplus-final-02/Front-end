import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { SYSTEM_TAGS } from "@/services/mockData";
import { CheckCircle, XCircle } from "lucide-react";

const SignupPage: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();
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

    // 중복 확인 검증
    if (!emailCheck.checked || !emailCheck.isAvailable) {
      setError("이메일 중복 확인을 완료해주세요.");
      return;
    }

    if (!nicknameCheck.checked || !nicknameCheck.isAvailable) {
      setError("닉네임 중복 확인을 완료해주세요.");
      return;
    }

    // 유효성 검증
    if (formData.password !== formData.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    if (formData.password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      return;
    }

    if (selectedTags.length === 0) {
      setError("최소 1개 이상의 선호 태그를 선택해주세요.");
      return;
    }

    setLoading(true);

    try {
      await signup(
        formData.email,
        formData.password,
        formData.nickname,
        selectedTags,
        formData.isLGUPlus,
      );
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">회원가입</h1>
          <p className="text-gray-400">OTT 플랫폼에 오신 것을 환영합니다</p>
        </div>

        <div className="bg-gray-900 rounded-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이메일 */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
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
              {/* 중복 확인 결과 */}
              {emailCheck.checked && (
                <div className="flex items-center gap-2 mt-2">
                  {emailCheck.isAvailable ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <p
                    className={`text-sm ${
                      emailCheck.isAvailable ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {emailCheck.message}
                  </p>
                </div>
              )}
            </div>

            {/* 닉네임 */}
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
              {/* 중복 확인 결과 */}
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
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                required
                className="input-field"
                placeholder="비밀번호를 다시 입력하세요"
              />
            </div>

            {/* 선호 태그 */}
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

            {/* LG U+ 회원 */}
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
