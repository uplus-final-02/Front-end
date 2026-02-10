import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { contentService } from "@/services/contentService";
import { Content } from "@/types";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [suggestions, setSuggestions] = useState<Content[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 검색어 변경 시 자동완성
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const results = await contentService.searchContents(searchQuery);
          setSuggestions(results.slice(0, 5)); // 최대 5개만 표시
          setShowSuggestions(true);
          setSelectedIndex(-1);
        } catch (error) {
          console.error("자동완성 실패:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (content: Content) => {
    navigate(`/content/${content.id}`);
    setSearchQuery("");
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-dark border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link to="/" className="text-2xl font-bold text-primary">
            OTT
          </Link>

          {/* 네비게이션 - 데스크톱 */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-primary transition-colors">
              홈
            </Link>
            <Link
              to="/original"
              className="hover:text-primary transition-colors"
            >
              오리지널
            </Link>
            <Link
              to="/creator"
              className="hover:text-primary transition-colors"
            >
              크리에이터
            </Link>
            {user && (
              <Link
                to="/studio"
                className="hover:text-primary transition-colors"
              >
                스튜디오
              </Link>
            )}
          </nav>

          {/* 검색 & 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 검색 */}
            <form onSubmit={handleSearch} className="hidden md:block">
              <div className="relative" ref={searchRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() =>
                    searchQuery.length >= 2 && setShowSuggestions(true)
                  }
                  placeholder="검색..."
                  className="bg-gray-800 border border-gray-700 rounded-full pl-10 pr-4 py-2 w-64 focus:outline-none focus:border-primary transition-colors"
                  autoComplete="off"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

                {/* 자동완성 드롭다운 */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                    {suggestions.map((content, index) => (
                      <div
                        key={content.id}
                        onClick={() => handleSuggestionClick(content)}
                        className={`flex items-center space-x-3 p-3 cursor-pointer transition-colors ${
                          index === selectedIndex
                            ? "bg-gray-700"
                            : "hover:bg-gray-800"
                        }`}
                      >
                        <img
                          src={content.thumbnailUrl}
                          alt={content.title}
                          className="w-16 h-10 object-cover rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {content.title}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {content.uploaderName} ·{" "}
                            {content.viewCount.toLocaleString()} 조회
                          </p>
                        </div>
                        {content.isOriginal && (
                          <span className="bg-primary px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
                            오리지널
                          </span>
                        )}
                        {content.isSeries && (
                          <span className="bg-blue-600 px-2 py-0.5 rounded text-xs font-bold flex-shrink-0">
                            시리즈
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </form>

            {/* 사용자 메뉴 */}
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/mypage"
                  className="flex items-center space-x-2 hover:text-primary transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="hidden md:inline">{user.nickname}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 hover:text-primary transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="hidden md:inline">로그아웃</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn-secondary text-sm">
                  로그인
                </Link>
                <Link to="/signup" className="btn-primary text-sm">
                  회원가입
                </Link>
              </div>
            )}

            {/* 모바일 메뉴 버튼 */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden"
            >
              {showMobileMenu ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {showMobileMenu && (
          <div className="md:hidden py-4 border-t border-gray-800">
            <nav className="flex flex-col space-y-4">
              <Link
                to="/"
                onClick={() => setShowMobileMenu(false)}
                className="hover:text-primary transition-colors"
              >
                홈
              </Link>
              <Link
                to="/original"
                onClick={() => setShowMobileMenu(false)}
                className="hover:text-primary transition-colors"
              >
                오리지널
              </Link>
              <Link
                to="/creator"
                onClick={() => setShowMobileMenu(false)}
                className="hover:text-primary transition-colors"
              >
                크리에이터
              </Link>
              {user && (
                <Link
                  to="/studio"
                  onClick={() => setShowMobileMenu(false)}
                  className="hover:text-primary transition-colors"
                >
                  스튜디오
                </Link>
              )}
              <form onSubmit={handleSearch} className="pt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="검색..."
                  className="input-field"
                />
              </form>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
