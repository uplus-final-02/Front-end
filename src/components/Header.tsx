import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, LogOut, Menu, X, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { contentService } from "@/services/contentService";
import { Content } from "@/types";

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="bg-dark border-b border-gray-800 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 로고 */}
          <Link to="/" className="text-2xl font-bold flex items-center">
            <span className="text-primary">U</span>
            <span className="text-white">TOPIA</span>
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
            <Link to="/admin" className="hover:text-primary transition-colors">
              백오피스
            </Link>
          </nav>

          {/* 검색 & 사용자 메뉴 */}
          <div className="flex items-center space-x-4">
            {/* 검색 아이콘 */}
            <button
              onClick={() => navigate("/search")}
              className="hidden md:flex items-center justify-center w-10 h-10 hover:bg-gray-800 rounded-full transition-colors"
              title="검색"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* 사용자 메뉴 */}
            {user ? (
              <div className="flex items-center space-x-4">
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 hover:text-primary transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="hidden md:inline">{user.nickname}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {/* 사용자 드롭다운 메뉴 */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden z-50">
                      <Link
                        to="/mypage"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-gray-800 transition-colors"
                      >
                        마이페이지
                      </Link>
                      <Link
                        to="/studio"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-4 py-3 hover:bg-gray-800 transition-colors"
                      >
                        스튜디오
                      </Link>
                    </div>
                  )}
                </div>
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
              <Link
                to="/admin"
                onClick={() => setShowMobileMenu(false)}
                className="hover:text-primary transition-colors"
              >
                백오피스
              </Link>
              {user && (
                <>
                  <Link
                    to="/mypage"
                    onClick={() => setShowMobileMenu(false)}
                    className="hover:text-primary transition-colors"
                  >
                    마이페이지
                  </Link>
                  <Link
                    to="/studio"
                    onClick={() => setShowMobileMenu(false)}
                    className="hover:text-primary transition-colors"
                  >
                    스튜디오
                  </Link>
                </>
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
