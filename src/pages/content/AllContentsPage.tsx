import React, { useEffect, useState, useRef, useCallback } from "react";
import { LayoutGrid } from "lucide-react";
import { Content } from "@/types/content";
import { contentService } from "@/services/contentService";
import ContentCard from "@/components/content/ContentCard";
import ContentModal from "@/components/content/ContentModal";

const AllContentsPage: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [tags, setTags] = useState<{ tagId: number; name: string }[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingMoreRef = useRef(false);
  const pageRef = useRef(0);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchTags();
  }, []);

  useEffect(() => {
    loadInitialContents();
  }, [selectedTag]);

  const fetchTags = async () => {
    try {
      const fetchedTags = await contentService.getTags("LEVEL_1");
      setTags(fetchedTags);
    } catch (error) {
      console.error("태그 로딩 실패:", error);
    }
  };

  const handleTagClick = (tagName: string) => {
    setSelectedTag(selectedTag === tagName ? null : tagName);
  };

  const loadInitialContents = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    pageRef.current = 0;
    try {
      const data = await contentService.getDefaultContentList({
        page: 0,
        size: 30,
        tag: selectedTag ?? undefined,
      });
      setContents(data);
      if (data.length < 30) setHasMore(false);
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTag]);

  const loadMoreContents = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    try {
      const nextPage = pageRef.current + 1;
      const newContents = await contentService.getDefaultContentList({
        page: nextPage,
        size: 30,
        tag: selectedTag ?? undefined,
      });
      if (newContents.length < 30) setHasMore(false);
      setContents((prev) => [...prev, ...newContents]);
      pageRef.current = nextPage;
    } catch (error) {
      console.error("추가 콘텐츠 로딩 실패:", error);
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMore, selectedTag]);

  const loadMoreRefCallback = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) observerRef.current.disconnect();
      if (!node || !hasMore) return;
      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) loadMoreContents();
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(node);
    },
    [loadMoreContents, hasMore],
  );

  if (loading && contents.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-3">
            <LayoutGrid className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">전체 콘텐츠</h1>
          </div>
          <p className="text-xl text-gray-400">
            UTOPIA에서 제공하는 모든 콘텐츠를 만나보세요
          </p>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              selectedTag === null
                ? "bg-primary text-white"
                : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            전체
          </button>
          {tags.map((tag) => (
            <button
              key={tag.tagId}
              onClick={() => handleTagClick(tag.name)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                selectedTag === tag.name
                  ? "bg-primary text-white"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>

        {loading && contents.length === 0 ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : contents.length === 0 ? (
          <div className="text-center py-20">
            <LayoutGrid className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">
              {selectedTag
                ? `"${selectedTag}" 태그의 콘텐츠가 없습니다.`
                : "콘텐츠가 없습니다."}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {contents.map((content) => (
                <ContentCard
                  key={content.id}
                  content={content}
                  onCardClick={setSelectedContent}
                />
              ))}
            </div>

            {hasMore && (
              <div
                ref={loadMoreRefCallback}
                className="flex justify-center py-8"
              >
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {!hasMore && contents.length > 0 && (
              <div className="text-center py-8 text-gray-400">
                모든 콘텐츠를 불러왔습니다.
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

export default AllContentsPage;
