import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Video, Image as ImageIcon, Tag, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SYSTEM_TAGS } from "@/services/mockData";

const StudioPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    videoFile: null as File | null,
    thumbnailFile: null as File | null,
  });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, videoFile: e.target.files[0] });
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, thumbnailFile: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.videoFile) {
      alert("비디오 파일을 선택해주세요.");
      return;
    }

    if (selectedTags.length === 0) {
      alert("최소 1개 이상의 태그를 선택해주세요.");
      return;
    }

    setUploading(true);

    try {
      // 모킹 업로드 프로세스
      await new Promise((resolve) => setTimeout(resolve, 3000));

      alert("콘텐츠가 업로드되었습니다! 관리자 승인 후 게시됩니다.");
      navigate("/");
    } catch (error) {
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">스튜디오</h1>
            <p className="text-gray-400">
              나만의 콘텐츠를 업로드하고 공유하세요
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 제목 */}
              <div>
                <label className="block text-sm font-medium mb-2">제목 *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="input-field"
                  placeholder="콘텐츠 제목을 입력하세요"
                />
              </div>

              {/* 설명 */}
              <div>
                <label className="block text-sm font-medium mb-2">설명 *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  required
                  rows={4}
                  className="input-field resize-none"
                  placeholder="콘텐츠에 대한 설명을 입력하세요"
                />
              </div>

              {/* 비디오 업로드 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  비디오 파일 * (1-5분 권장)
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                    id="video-upload"
                  />
                  <label htmlFor="video-upload" className="cursor-pointer">
                    <Video className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    {formData.videoFile ? (
                      <p className="text-primary">{formData.videoFile.name}</p>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-1">
                          클릭하여 비디오 업로드
                        </p>
                        <p className="text-xs text-gray-600">
                          MP4, MOV, AVI 등
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 썸네일 업로드 */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  썸네일 이미지
                </label>
                <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                    id="thumbnail-upload"
                  />
                  <label htmlFor="thumbnail-upload" className="cursor-pointer">
                    <ImageIcon className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    {formData.thumbnailFile ? (
                      <p className="text-primary">
                        {formData.thumbnailFile.name}
                      </p>
                    ) : (
                      <>
                        <p className="text-gray-400 mb-1">
                          클릭하여 썸네일 업로드
                        </p>
                        <p className="text-xs text-gray-600">
                          JPG, PNG (16:9 비율 권장)
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* 태그 선택 */}
              <div>
                <label className="block text-sm font-medium mb-3">
                  <Tag className="w-4 h-4 inline mr-1" />
                  태그 선택 * (최소 1개)
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

              {/* 안내 사항 */}
              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold mb-2">업로드 가이드</h3>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• 비디오 길이: 1-5분 권장</li>
                  <li>• 파일 크기: 최대 500MB</li>
                  <li>• 해상도: 최소 720p 권장</li>
                  <li>• 업로드 후 관리자 승인이 필요합니다</li>
                  <li>• 저작권을 침해하는 콘텐츠는 삭제될 수 있습니다</li>
                </ul>
              </div>

              {/* 제출 버튼 */}
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2"></div>
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 inline mr-2" />
                      업로드
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="btn-secondary"
                  disabled={uploading}
                >
                  취소
                </button>
              </div>
            </form>
          </div>

          {/* 내 콘텐츠 관리 */}
          <div className="mt-8 bg-gray-900 rounded-lg p-8">
            <h2 className="text-xl font-bold mb-4">내 콘텐츠</h2>
            <div className="text-center py-12 text-gray-500">
              <Video className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>업로드한 콘텐츠가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudioPage;
