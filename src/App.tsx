import React from "react";
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import MyPage from "./pages/MyPage";
import SearchPage from "./pages/SearchPage";
import SubscribePage from "./pages/SubscribePage";
import OriginalPage from "./pages/OriginalPage";
import CreatorPage from "./pages/CreatorPage";
import StudioPage from "./pages/StudioPage";

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
        <Route path="/creator" element={<CreatorPage />} />
        <Route path="/studio" element={<StudioPage />} />
      </Routes>
    </div>
  );
};

export default App;
