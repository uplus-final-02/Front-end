import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Content } from "@/types";
import { contentService } from "@/services/contentService";
import { SYSTEM_TAGS } from "@/services/mockData";
import ContentCard from "@/components/ContentCard";
import ContentModal from "@/components/ContentModal";

type TabType = "all" | "original" | "creator";

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<Content[]>([]);
  const [allContents, setAllContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    loadAllContents();
  }, []);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const loadAllContents = async () => {
    try {
      const contents = await contentService.getContents();
      setAllContents(contents);
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const data = await contentService.searchContents(query);
      setResults(data);
    } catch (error) {
      console.error("검색 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchParams({ q: searchQuery });
      performSearch(searchQuery);
    }
  };

  // 필터링된 콘텐츠
  const getFilteredContents = () => {
    const baseContents = searchQuery.trim() ? results : allContents;
    let filtered = [...baseContents];

    // 탭 필터링
    if (activeTab === "original") {
      filtered = filtered.filter((c) => c.type === "original");
    } else if (activeTab === "creator") {
      filtered = filtered.filter((c) => c.type === "creator");
    }

    // 태그 필터링
    if (selectedTag) {
      filtered = filtered.filter((c) => c.tags.includes(selectedTag));
    }

    return filtered;
  };

  const filteredContents = getFilteredContents();
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        {/* 검색창 */}
        <div className="mb-8 flex justify-center">
          <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="제목, 태그, 크리에이터로 검색..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary px-6 py-2"
            >
              검색
            </button>
          </form>
        </div>

        {/* 태그 필터 */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedTag === null
                  ? "bg-primary text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              전체
            </button>
            {SYSTEM_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </section>

        {/* 탭 필터 */}
        <section className="mb-6">
          <div className="flex gap-4 border-b border-gray-800">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "all"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              전체
              {activeTab === "all" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("original")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "original"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              오리지널
              {activeTab === "original" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("creator")}
              className={`px-4 py-2 font-medium transition-colors relative ${
                activeTab === "creator"
                  ? "text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              크리에이터
              {activeTab === "creator" && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </section>

        {/* 결과 헤더 */}
        {hasSearchQuery && (
          <div className="mb-6">
            <p className="text-gray-400">
              "{searchQuery}" 검색 결과 {filteredContents.length}개
            </p>
          </div>
        )}

        {/* 콘텐츠 그리드 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">검색 중...</p>
            </div>
          </div>
        ) : filteredContents.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400 mb-2">
              {hasSearchQuery
                ? "검색 결과가 없습니다."
                : "검색어를 입력하거나 태그를 선택해보세요."}
            </p>
            {hasSearchQuery && (
              <p className="text-gray-500">다른 검색어를 시도해보세요.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {filteredContents.map((content) => (
              <ContentCard
                key={content.id}
                content={content}
                onCardClick={setSelectedContent}
              />
            ))}
          </div>
        )}
      </div>

      {selectedContent && (
        <ContentModal
          content={selectedContent}
          onClose={() => setSelectedContent(null)}
        />
      )}
    </div>
  );
};

export default SearchPage;
