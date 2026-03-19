import React from "react";

const TMDB_LOGO_URL =
  "https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg";

const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-gray-800 bg-dark py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        {/* 상단: 왼쪽 TMDb / 오른쪽 GitHub */}
        <div className="flex items-center justify-between mb-4">
          {/* 왼쪽: TMDb */}
          <div className="flex flex-col items-start gap-1.5">
            <a
              href="https://www.themoviedb.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src={TMDB_LOGO_URL} alt="TMDB Logo" className="h-5" />
            </a>
            <p className="text-[11px] text-gray-500">
              This product uses the TMDb API but is not endorsed or certified by
              TMDb.
            </p>
          </div>

          {/* 오른쪽: GitHub */}
          <a
            href="https://github.com/uplus-final-02"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
        </div>

        {/* 하단: 저작권 */}
        <div className="text-center text-[11px] text-gray-600 pt-3">
          <p>© 2026 UTOPIA. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
