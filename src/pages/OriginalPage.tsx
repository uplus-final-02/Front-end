import React, { useEffect, useState } from "react";
import { Crown } from "lucide-react";
import { Content } from "@/types";
import { contentService } from "@/services/contentService";
import ContentCard from "@/components/ContentCard";
import ContentModal from "@/components/ContentModal";

const OriginalPage: React.FC = () => {
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    setLoading(true);
    try {
      const data = await contentService.getContents({ type: "original" });
      setContents(data);
    } catch (error) {
      console.error("콘텐츠 로딩 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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
            <Crown className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">오리지널 콘텐츠</h1>
          </div>
          <p className="text-xl text-gray-400">
            독점 제공되는 프리미엄 오리지널 콘텐츠를 만나보세요
          </p>
        </div>

        {contents.length === 0 ? (
          <div className="text-center py-20">
            <Crown className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-xl text-gray-400">오리지널 콘텐츠가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {contents.map((content) => (
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

export default OriginalPage;
