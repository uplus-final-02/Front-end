import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/common/Header";
import HomePage from "./pages/content/HomePage";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ContentDetailPage from "./pages/content/ContentDetailPage";
import MyPage from "./pages/user/MyPage";
import SearchPage from "./pages/content/SearchPage";
import SubscribePage from "./pages/user/SubscribePage";
import OriginalPage from "./pages/content/OriginalPage";
import AllContentsPage from "./pages/content/AllContentsPage";
import MoviePage from "./pages/content/MoviePage";
import SeriesPage from "./pages/content/SeriesPage";
import CreatorPage from "./pages/creator/CreatorPage";
import StudioPage from "./pages/creator/StudioPage";
import AdminPage from "./pages/admin/AdminPage";
import OAuthCallbackPage from "./pages/auth/OAuthCallbackPage";
import SocialSetupPage from "./pages/auth/SocialSetupPage";

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-dark text-white">
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/content/:id" element={<ContentDetailPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/subscribe" element={<SubscribePage />} />
        <Route path="/original" element={<OriginalPage />} />
        <Route path="/all" element={<AllContentsPage />} />
        <Route path="/movie" element={<MoviePage />} />
        <Route path="/series" element={<SeriesPage />} />
        <Route path="/creator" element={<CreatorPage />} />
        <Route path="/creator/:videoId" element={<CreatorPage />} />
        <Route path="/studio" element={<StudioPage />} />
        <Route path="/admin" element={<AdminPage />} />
        {/* OAuth 콜백 라우트 */}
        <Route
          path="/oauth/callback/:provider"
          element={<OAuthCallbackPage />}
        />
        {/* 소셜 로그인 후 추가 정보 입력 */}
        <Route path="/social-setup" element={<SocialSetupPage />} />
      </Routes>
    </div>
  );
};

export default App;
