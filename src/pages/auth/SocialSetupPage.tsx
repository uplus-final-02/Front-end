import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import type { SocialProvider } from "@/types";

const SocialSetupPage: React.FC = () => {
  const { signupComplete } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as {
    setupToken?: string;
    provider?: SocialProvider;
  };

  const [step, setStep] = useState<"nickname" | "tags">("nickname");
  const [nickname, setNickname] = useState("");
  const [tags, setTags] = useState<{ tagId: number; name: string }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [setupToken, setSetupToken] = useState(state?.setupToken || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tagsLoading, setTagsLoading] = useState(false);

  useEffect(() => {
    if (!state?.setupToken) {
      navigate("/login");
    }
  }, [state, navigate]);

  // STEP 1: 닉네임 설정
  const handleSetNickname = async () => {
    if (!nickname) {
      setError("닉네임을 입력해주세요.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const newToken = await authService.setNickname(setupToken, nickname);
      setSetupToken(newToken);

      // 태그 목록 로딩
      setTagsLoading(true);
      const tagList = await authService.getTags("LEVEL_0");
      setTags(tagList);
      setTagsLoading(false);
      setStep("tags");
    } catch (err) {
      setError(err instanceof Error ? err.message : "닉네임 설정 실패");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: 태그 선택 → 회원가입 완료
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
        "", // 소셜 로그인은 이메일 없음
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

  const providerName = {
    google: "구글",
    kakao: "카카오",
    naver: "네이버",
  }[state?.provider || "google"];

  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-lg">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block text-3xl font-bold mb-4">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">
            {providerName} 계정으로 가입
          </h1>
          <p className="text-sm text-gray-400">
            추가 정보를 입력하여 가입을 완료하세요
          </p>
        </div>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center mb-8 gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              step === "nickname"
                ? "bg-primary text-white"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            1
          </div>
          <span
            className={`text-sm ${
              step === "nickname" ? "text-white" : "text-gray-500"
            }`}
          >
            닉네임 설정
          </span>
          <div
            className={`w-8 h-0.5 ${
              step === "tags" ? "bg-primary" : "bg-gray-700"
            }`}
          />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
              step === "tags"
                ? "bg-primary text-white"
                : "bg-gray-700 text-gray-400"
            }`}
          >
            2
          </div>
          <span
            className={`text-sm ${
              step === "tags" ? "text-white" : "text-gray-500"
            }`}
          >
            태그 선택
          </span>
        </div>

        <div className="bg-gray-900 rounded-lg p-8">
          {/* STEP 1: 닉네임 설정 */}
          {step === "nickname" && (
            <div className="space-y-5">
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
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  다른 사용자에게 표시될 이름입니다
                </p>
              </div>

              <button
                type="button"
                onClick={handleSetNickname}
                disabled={loading || !nickname}
                className="w-full btn-primary disabled:opacity-50"
              >
                {loading ? "설정 중..." : "다음"}
              </button>
            </div>
          )}

          {/* STEP 2: 태그 선택 */}
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
        </div>
      </div>
    </div>
  );
};

export default SocialSetupPage;
