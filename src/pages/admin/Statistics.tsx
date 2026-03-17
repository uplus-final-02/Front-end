import React, { useState } from "react";
import HomeTagStatistics from "./HomeTagStatistics";
import TrendingOperations from "./TrendingOperations";

type StatsSubTab = "homeTags" | "trending";

const Statistics: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<StatsSubTab>("homeTags");

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gray-900 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab("homeTags")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeSubTab === "homeTags"
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            홈 태그 통계
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("trending")}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeSubTab === "trending"
                ? "bg-primary text-black"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
          >
            인기차트 운영
          </button>
        </div>
      </section>

      {activeSubTab === "homeTags" && <HomeTagStatistics />}
      {activeSubTab === "trending" && <TrendingOperations />}
    </div>
  );
};

export default Statistics;