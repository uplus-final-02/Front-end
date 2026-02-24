import React, { useState } from "react";
import {
  Users,
  Video,
  BarChart3,
  Search,
  Upload,
  Edit,
  Trash2,
} from "lucide-react";

type TabType = "users" | "contents" | "stats";

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [searchKeyword, setSearchKeyword] = useState("");

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">백오피스</h1>
          <p className="text-gray-400">관리자 전용 페이지</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-4 mb-8 border-b border-gray-800">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "users"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5" />
            사용자 관리
          </button>
          <button
            onClick={() => setActiveTab("contents")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "contents"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Video className="w-5 h-5" />
            콘텐츠 관리
          </button>
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === "stats"
                ? "text-primary border-b-2 border-primary"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            통계/분석
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {activeTab === "users" && (
          <UsersManagement
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
          />
        )}
        {activeTab === "contents" && (
          <ContentsManagement
            searchKeyword={searchKeyword}
            setSearchKeyword={setSearchKeyword}
          />
        )}
        {activeTab === "stats" && <Statistics />}
      </div>
    </div>
  );
};

// 사용자 관리 컴포넌트
const UsersManagement: React.FC<{
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
}> = ({ searchKeyword, setSearchKeyword }) => {
  // Mock 데이터
  const mockUsers = [
    {
      id: 1,
      email: "user1@example.com",
      nickname: "사용자1",
      membership: "일반",
      createdAt: "2024-01-15",
    },
    {
      id: 2,
      email: "user2@example.com",
      nickname: "사용자2",
      membership: "LG U+",
      createdAt: "2024-02-20",
    },
    {
      id: 3,
      email: "user3@example.com",
      nickname: "사용자3",
      membership: "미구독",
      createdAt: "2024-03-10",
    },
  ];

  return (
    <div>
      {/* 검색 */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="이메일 또는 닉네임으로 검색..."
            className="w-full bg-gray-800 border border-gray-700 rounded pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* 사용자 목록 테이블 */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                이메일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                닉네임
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                멤버십
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                가입일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {mockUsers.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm">{user.id}</td>
                <td className="px-6 py-4 text-sm">{user.email}</td>
                <td className="px-6 py-4 text-sm">{user.nickname}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      user.membership === "LG U+"
                        ? "bg-primary/20 text-primary"
                        : user.membership === "일반"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {user.membership}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {user.createdAt}
                </td>
                <td className="px-6 py-4 text-sm">
                  <button
                    onClick={() =>
                      alert(`사용자 ${user.id} 상세 정보 (API 연동 예정)`)
                    }
                    className="text-primary hover:underline"
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="mt-6 flex justify-center gap-2">
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          이전
        </button>
        <button className="px-4 py-2 bg-primary rounded">1</button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          2
        </button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          3
        </button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          다음
        </button>
      </div>
    </div>
  );
};

// 콘텐츠 관리 컴포넌트
const ContentsManagement: React.FC<{
  searchKeyword: string;
  setSearchKeyword: (value: string) => void;
}> = ({ searchKeyword, setSearchKeyword }) => {
  // Mock 데이터
  const mockContents = [
    {
      id: 1,
      title: "액션 영화 1",
      type: "MOVIE",
      category: "OTT",
      status: "완료",
      uploadDate: "2024-01-10",
      thumbnail: "https://picsum.photos/seed/movie1/200/120",
    },
    {
      id: 2,
      title: "드라마 시리즈 1",
      type: "SERIES",
      category: "OTT",
      status: "트랜스코딩 중",
      uploadDate: "2024-02-15",
      thumbnail: "https://picsum.photos/seed/series1/200/120",
    },
    {
      id: 3,
      title: "사용자 업로드 영상",
      type: "MOVIE",
      category: "USER",
      status: "완료",
      uploadDate: "2024-03-05",
      thumbnail: "https://picsum.photos/seed/user1/200/120",
    },
  ];

  return (
    <div>
      {/* 검색 및 등록 버튼 */}
      <div className="mb-6 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="콘텐츠 제목으로 검색..."
            className="w-full bg-gray-800 border border-gray-700 rounded pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary transition-colors"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button
          onClick={() => alert("콘텐츠 등록 모달 (API 연동 예정)")}
          className="btn-primary flex items-center gap-2 whitespace-nowrap"
        >
          <Upload className="w-4 h-4" />
          콘텐츠 등록
        </button>
      </div>

      {/* 콘텐츠 목록 테이블 */}
      <div className="bg-gray-900 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium">ID</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                썸네일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">제목</th>
              <th className="px-6 py-3 text-left text-sm font-medium">타입</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                카테고리
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">상태</th>
              <th className="px-6 py-3 text-left text-sm font-medium">
                업로드일
              </th>
              <th className="px-6 py-3 text-left text-sm font-medium">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {mockContents.map((content) => (
              <tr
                key={content.id}
                className="hover:bg-gray-800/50 transition-colors"
              >
                <td className="px-6 py-4 text-sm">{content.id}</td>
                <td className="px-6 py-4">
                  <img
                    src={content.thumbnail}
                    alt={content.title}
                    className="w-24 h-14 object-cover rounded"
                  />
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  {content.title}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 bg-gray-800 rounded text-xs">
                    {content.type}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      content.category === "OTT"
                        ? "bg-primary/20 text-primary"
                        : "bg-blue-500/20 text-blue-400"
                    }`}
                  >
                    {content.category}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      content.status === "완료"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {content.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">
                  {content.uploadDate}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        alert(`콘텐츠 ${content.id} 수정 (API 연동 예정)`)
                      }
                      className="p-1 hover:text-primary transition-colors"
                      title="수정"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        alert(`콘텐츠 ${content.id} 삭제 (API 연동 예정)`)
                      }
                      className="p-1 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      <div className="mt-6 flex justify-center gap-2">
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          이전
        </button>
        <button className="px-4 py-2 bg-primary rounded">1</button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          2
        </button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          3
        </button>
        <button className="px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors">
          다음
        </button>
      </div>
    </div>
  );
};

// 통계/분석 컴포넌트
const Statistics: React.FC = () => {
  // Mock 데이터
  const popularContents = [
    {
      rank: 1,
      title: "인기 영화 1",
      views: 15000,
      bookmarks: 3200,
      completionRate: 85,
    },
    {
      rank: 2,
      title: "인기 드라마 1",
      views: 12000,
      bookmarks: 2800,
      completionRate: 78,
    },
    {
      rank: 3,
      title: "인기 영화 2",
      views: 10000,
      bookmarks: 2500,
      completionRate: 82,
    },
  ];

  const tagStats = [
    { tag: "액션", count: 5000, percentage: 25 },
    { tag: "드라마", count: 4000, percentage: 20 },
    { tag: "코미디", count: 3500, percentage: 17.5 },
    { tag: "스릴러", count: 3000, percentage: 15 },
    { tag: "로맨스", count: 2500, percentage: 12.5 },
  ];

  return (
    <div className="space-y-8">
      {/* 인기 차트 */}
      <div>
        <h2 className="text-2xl font-bold mb-4">인기 콘텐츠 순위</h2>
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  순위
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  제목
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  조회수
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  찜하기
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium">
                  완료율
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {popularContents.map((content) => (
                <tr
                  key={content.rank}
                  className="hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">
                    <span className="flex items-center justify-center w-8 h-8 bg-primary rounded-full font-bold">
                      {content.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    {content.title}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {content.views.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {content.bookmarks.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-800 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${content.completionRate}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">
                        {content.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 태그 통계 */}
      <div>
        <h2 className="text-2xl font-bold mb-4">선호 태그 통계</h2>
        <div className="bg-gray-900 rounded-lg p-6">
          <div className="space-y-4">
            {tagStats.map((stat) => (
              <div key={stat.tag}>
                <div className="flex justify-between mb-2">
                  <span className="font-medium">{stat.tag}</span>
                  <span className="text-sm text-gray-400">
                    {stat.count.toLocaleString()}회 ({stat.percentage}%)
                  </span>
                </div>
                <div className="bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">전체 사용자</h3>
          <p className="text-3xl font-bold">1,234</p>
          <p className="text-sm text-green-400 mt-2">↑ 12% 지난주 대비</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">전체 콘텐츠</h3>
          <p className="text-3xl font-bold">567</p>
          <p className="text-sm text-green-400 mt-2">↑ 8% 지난주 대비</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-6">
          <h3 className="text-gray-400 text-sm mb-2">총 시청 시간</h3>
          <p className="text-3xl font-bold">45,678h</p>
          <p className="text-sm text-green-400 mt-2">↑ 15% 지난주 대비</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
