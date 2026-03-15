import React, { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2 } from "lucide-react";
import { Content } from "@/types";
import { searchService, type SearchParams } from "@/services/searchService";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";

type SortType = "RELATED" | "LATEST" | "POPULAR";

const PAGE_SIZE = 15;

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const initialTag = searchParams.get("tag") || "";

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [sortType, setSortType] = useState<SortType>("RELATED");
  const [selectedTag, setSelectedTag] = useState<string | undefined>(undefined);
  const [hasNext, setHasNext] = useState(false);
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // 자동완성
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // 태그 목록 (API에서 가져오기)
  const [allTags, setAllTags] = useState<{ tagId: number; name: string }[]>([]);

  useEffect(() => {
    // 태그 목록 로드
    const loadTags = async () => {
      try {
        const { profileService } = await import("@/services/profileService");
        const tags = await profileService.getAllTags();
        setAllTags(tags);
      } catch {
        // 실패 시 무시
      }
    };
    loadTags();
  }, []);

  // 검색 실행
  const doSearch = useCallback(
    async (
      query: string,
      tag: string | undefined,
      sort: SortType,
      pageNum: number,
      append: boolean = false,
    ) => {
      const hasKeyword = query.trim().length > 0;
      const hasTag = !!tag;
      if (!hasKeyword && !hasTag) {
        setResults([]);
        setMessage("");
        setHasNext(false);
        return;
      }

      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      try {
        const params: SearchParams = {
          sort,
          page: pageNum,
          size: PAGE_SIZE,
        };
        if (hasKeyword) params.keyword = query.trim();
        if (hasTag) params.tag = tag;

        const data = await searchService.search(params);
        setResults((prev) =>
          append ? [...prev, ...data.contents] : data.contents,
        );
        setHasNext(data.hasNext);
        setMessage(data.message);
        setPage(pageNum);
      } catch (error: any) {
        console.error("검색 실패:", error);
        if (!append) setResults([]);
        if (error.response?.status === 500) {
          setError(
            "검색 서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
          );
        } else {
          setError("검색 중 오류가 발생했습니다.");
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [],
  );

  // 초기 로드 & URL 파라미터 변경 시
  useEffect(() => {
    // URL에 쿼리나 태그가 있을 때만 자동 검색
    if (initialQuery || initialTag) {
      setSelectedTag(initialTag || undefined);
      doSearch(initialQuery, initialTag || undefined, sortType, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialTag]);

  // 정렬 변경 시 재검색
  const handleSortChange = (sort: SortType) => {
    setSortType(sort);
    doSearch(searchQuery, selectedTag, sort, 0);
  };

  // 태그 클릭
  const handleTagClick = (tagName: string) => {
    setSelectedTag(tagName);
    const params: Record<string, string> = {};
    if (searchQuery.trim()) params.q = searchQuery;
    params.tag = tagName;
    setSearchParams(params);
    doSearch(searchQuery, tagName, sortType, 0);
  };

  // 검색 폼 제출
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    const params: Record<string, string> = {};
    if (searchQuery.trim()) params.q = searchQuery;
    if (selectedTag) params.tag = selectedTag;
    setSearchParams(params);
    doSearch(searchQuery, selectedTag, sortType, 0);
  };

  // 더보기
  const handleLoadMore = () => {
    doSearch(searchQuery, selectedTag, sortType, page + 1, true);
  };

  // 자동완성 입력 핸들러
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);

    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    if (val.trim().length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      try {
        const list = await searchService.getSuggestions(val);
        setSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 200);
  };

  // 자동완성 항목 클릭
  const handleSuggestionClick = (text: string) => {
    setSearchQuery(text);
    setShowSuggestions(false);
    setSearchParams({ q: text, ...(selectedTag ? { tag: selectedTag } : {}) });
    doSearch(text, selectedTag, sortType, 0);
  };

  const hasSearchQuery =
    searchQuery.trim().length > 0 ||
    (selectedTag !== undefined && selectedTag !== null);

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        {/* 검색창 */}
        <div className="mb-8 flex justify-center">
          <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder="제목, 태그로 검색... (초성 검색 가능)"
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

            {/* 자동완성 드롭다운 */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg overflow-hidden z-50 shadow-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => handleSuggestionClick(s)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                  >
                    <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span>{s}</span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* 태그 필터 */}
        <section className="mb-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {allTags.map((tag) => (
              <button
                key={tag.tagId}
                onClick={() => handleTagClick(tag.name)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTag === tag.name
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                #{tag.name}
              </button>
            ))}
          </div>
        </section>

        {/* 정렬 */}
        <section className="mb-6 flex items-center justify-between">
          {hasSearchQuery && (
            <p className="text-gray-400 text-sm">
              {message || `검색 결과 ${results.length}개`}
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            {(["RELATED", "LATEST", "POPULAR"] as SortType[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSortChange(s)}
                className={`px-3 py-1.5 rounded text-sm transition-colors ${
                  sortType === s
                    ? "bg-primary text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "RELATED"
                  ? "관련도순"
                  : s === "LATEST"
                    ? "최신순"
                    : "인기순"}
              </button>
            ))}
          </div>
        </section>

        {/* 콘텐츠 그리드 */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-400">검색 중...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-red-400 mb-2">{error}</p>
            <button
              onClick={() => doSearch(searchQuery, selectedTag, sortType, 0)}
              className="btn-secondary mt-4"
            >
              다시 시도
            </button>
          </div>
        ) : results.length === 0 ? (
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
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {results.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onCardClick={setSelectedContent}
                />
              ))}
            </div>

            {hasNext && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="btn-secondary px-8 py-2.5 flex items-center gap-2 mx-auto"
                >
                  {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loadingMore ? "로딩 중..." : "더보기"}
                </button>
              </div>
            )}
          </>
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
