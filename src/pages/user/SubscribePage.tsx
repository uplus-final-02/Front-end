import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const SubscribePage: React.FC = () => {
  const { user, subscribe } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<"basic" | "premium">(
    "basic",
  );

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      // 모킹 결제 프로세스
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await subscribe(selectedPlan);
      alert("구독이 완료되었습니다!");
      navigate("/");
    } catch (error) {
      alert("구독 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (user.subscriptionType !== "none") {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <Crown className="w-20 h-20 text-primary mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-4">이미 구독 중입니다</h1>
          <p className="text-gray-400 mb-6">
            {user.isLGUPlus
              ? "LG U+ 회원으로 무료 구독 혜택을 받고 계십니다."
              : "프리미엄 콘텐츠를 마음껏 즐기세요!"}
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">구독 플랜 선택</h1>
          <p className="text-xl text-gray-400">
            프리미엄 콘텐츠를 무제한으로 즐기세요
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* 베이직 플랜 */}
          <div
            className={`bg-gray-900 rounded-lg p-8 cursor-pointer transition-all ${
              selectedPlan === "basic"
                ? "ring-2 ring-primary scale-105"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedPlan("basic")}
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">베이직</h2>
              <div className="text-4xl font-bold text-primary mb-2">
                ₩5,000
                <span className="text-lg text-gray-400">/월</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>모든 콘텐츠 무제한 시청</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>HD 화질 지원</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>배속 재생 기능</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>다음 화 자동 재생</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>광고 없음</span>
              </li>
            </ul>

            {selectedPlan === "basic" && (
              <div className="text-center text-primary font-semibold">
                선택됨
              </div>
            )}
          </div>

          {/* 프리미엄 플랜 */}
          <div
            className={`bg-gray-900 rounded-lg p-8 cursor-pointer transition-all relative ${
              selectedPlan === "premium"
                ? "ring-2 ring-primary scale-105"
                : "hover:bg-gray-800"
            }`}
            onClick={() => setSelectedPlan("premium")}
          >
            <div className="absolute top-4 right-4">
              <span className="bg-primary px-3 py-1 rounded-full text-xs font-bold">
                추천
              </span>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">프리미엄</h2>
              <div className="text-4xl font-bold text-primary mb-2">
                ₩9,900
                <span className="text-lg text-gray-400">/월</span>
              </div>
            </div>

            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>베이직 플랜의 모든 혜택</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>4K UHD 화질 지원</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>동시 시청 4대</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>오프라인 다운로드</span>
              </li>
              <li className="flex items-start">
                <Check className="w-5 h-5 text-primary mr-3 flex-shrink-0 mt-0.5" />
                <span>독점 콘텐츠 우선 공개</span>
              </li>
            </ul>

            {selectedPlan === "premium" && (
              <div className="text-center text-primary font-semibold">
                선택됨
              </div>
            )}
          </div>
        </div>

        {/* 구독 버튼 */}
        <div className="text-center mt-12">
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-primary text-lg px-12 py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "처리 중..."
              : `${selectedPlan === "basic" ? "베이직" : "프리미엄"} 플랜 구독하기`}
          </button>
          <p className="text-sm text-gray-500 mt-4">
            * 이 페이지는 데모용이며 실제 결제는 이루어지지 않습니다.
          </p>
        </div>

        {/* 혜택 비교 */}
        <div className="mt-16 bg-gray-900 rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-6 text-center">플랜 비교</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-4 px-4">기능</th>
                  <th className="text-center py-4 px-4">무료</th>
                  <th className="text-center py-4 px-4">베이직</th>
                  <th className="text-center py-4 px-4">프리미엄</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-800">
                  <td className="py-4 px-4">오리지널 콘텐츠</td>
                  <td className="text-center py-4 px-4 text-red-500">✗</td>
                  <td className="text-center py-4 px-4 text-primary">✓</td>
                  <td className="text-center py-4 px-4 text-primary">✓</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 px-4">화질</td>
                  <td className="text-center py-4 px-4">480p</td>
                  <td className="text-center py-4 px-4">1080p</td>
                  <td className="text-center py-4 px-4">4K UHD</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 px-4">배속 재생</td>
                  <td className="text-center py-4 px-4 text-red-500">✗</td>
                  <td className="text-center py-4 px-4 text-primary">✓</td>
                  <td className="text-center py-4 px-4 text-primary">✓</td>
                </tr>
                <tr className="border-b border-gray-800">
                  <td className="py-4 px-4">광고</td>
                  <td className="text-center py-4 px-4">있음</td>
                  <td className="text-center py-4 px-4">없음</td>
                  <td className="text-center py-4 px-4">없음</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">동시 시청</td>
                  <td className="text-center py-4 px-4">1대</td>
                  <td className="text-center py-4 px-4">2대</td>
                  <td className="text-center py-4 px-4">4대</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscribePage;
