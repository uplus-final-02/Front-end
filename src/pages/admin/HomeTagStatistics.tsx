import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  Search,
  Bookmark,
  Eye,
  Trophy,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

import { adminService } from "@/services/adminService";
import type { HomeTagStatItem } from "@/services/adminService";

type SortKey =
  | "totalViewCount"
  | "totalBookmarkCount"
  | "bookmarkRate"
  | "totalWatchCount"
  | "completedWatchCount"
  | "completionRate";

type RankingTabKey = "views" | "bookmarkRate" | "completionRate";

const HomeTagStatistics: React.FC = () => {
  const today = new Date().toISOString().slice(0, 10);

  const [selectedDate, setSelectedDate] = useState(today);
  const [stats, setStats] = useState<HomeTagStatItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [sortKey, setSortKey] = useState<SortKey>("totalViewCount");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [minWatchCount, setMinWatchCount] = useState<number>(0);

  const [rankingTab, setRankingTab] = useState<RankingTabKey>("views");
  const [showDetailTable, setShowDetailTable] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await adminService.getHomeTagStats(selectedDate);
      setStats(data);
    } catch (error) {
      console.error("홈 태그 통계 조회 실패:", error);
      setStats([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedDate]);

  const summary = useMemo(() => {
    const totalViewCount = stats.reduce((sum, item) => sum + item.totalViewCount, 0);
    const totalBookmarkCount = stats.reduce(
      (sum, item) => sum + item.totalBookmarkCount,
      0,
    );
    const totalWatchCount = stats.reduce((sum, item) => sum + item.totalWatchCount, 0);
    const completedWatchCount = stats.reduce(
      (sum, item) => sum + item.completedWatchCount,
      0,
    );

    const avgBookmarkRate =
      totalViewCount === 0 ? 0 : totalBookmarkCount / totalViewCount;

    const avgCompletionRate =
      totalWatchCount === 0 ? 0 : completedWatchCount / totalWatchCount;

    return {
      totalViewCount,
      totalBookmarkCount,
      totalWatchCount,
      completedWatchCount,
      avgBookmarkRate,
      avgCompletionRate,
    };
  }, [stats]);

  const filteredStats = useMemo(() => {
    return stats.filter((item) => {
      const matchesKeyword =
        item.tagName.toLowerCase().includes(searchKeyword.toLowerCase());
      const matchesWatchCount = item.totalWatchCount >= minWatchCount;
      return matchesKeyword && matchesWatchCount;
    });
  }, [stats, searchKeyword, minWatchCount]);

  const sortedStats = useMemo(() => {
    return [...filteredStats].sort((a, b) => {
      const aValue = a[sortKey] ?? 0;
      const bValue = b[sortKey] ?? 0;
      return Number(bValue) - Number(aValue);
    });
  }, [filteredStats, sortKey]);

  const topViewTags = useMemo(() => {
    return [...stats]
      .sort((a, b) => b.totalViewCount - a.totalViewCount)
      .slice(0, 5);
  }, [stats]);

  const topBookmarkRateTags = useMemo(() => {
    return [...stats]
      .filter((item) => item.totalViewCount > 0)
      .sort((a, b) => b.bookmarkRate - a.bookmarkRate)
      .slice(0, 5);
  }, [stats]);

  const topCompletionRateTags = useMemo(() => {
    return [...stats]
      .filter((item) => item.totalWatchCount > 0)
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);
  }, [stats]);

  const chartData = useMemo(() => {
    return [...stats]
      .sort((a, b) => b.totalViewCount - a.totalViewCount)
      .slice(0, 8)
      .map((item) => ({
        tagName: item.tagName,
        totalViewCount: item.totalViewCount,
      }));
  }, [stats]);

  const insight = useMemo(() => {
    const topView = topViewTags[0];
    const topBookmark = topBookmarkRateTags[0];
    const topCompletion = topCompletionRateTags[0];

    return {
      topView,
      topBookmark,
      topCompletion,
    };
  }, [topViewTags, topBookmarkRateTags, topCompletionRateTags]);

  const rankingItems = useMemo(() => {
    if (rankingTab === "views") {
      return topViewTags.map((item) => ({
        tagName: item.tagName,
        value: formatNumber(item.totalViewCount),
      }));
    }

    if (rankingTab === "bookmarkRate") {
      return topBookmarkRateTags.map((item) => ({
        tagName: item.tagName,
        value: formatRate(item.bookmarkRate),
      }));
    }

    return topCompletionRateTags.map((item) => ({
      tagName: item.tagName,
      value: formatRate(item.completionRate),
    }));
  }, [rankingTab, topViewTags, topBookmarkRateTags, topCompletionRateTags]);

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">홈 노출 태그 성과 대시보드</h2>
            <p className="mt-2 text-sm text-gray-400">
              홈 노출(priority=1) 태그의 성과 지표를 KPI 요약 → 태그별 비교 → 상세 분석 흐름으로 제공합니다.
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs text-gray-400">기준 날짜</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
            />
          </div>
        </div>
      </SectionCard>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={<Eye className="h-5 w-5" />}
          title="총 조회수"
          value={formatNumber(summary.totalViewCount)}
          description="홈 노출 태그 전체 조회수 합산"
        />
        <KpiCard
          icon={<Bookmark className="h-5 w-5" />}
          title="총 북마크"
          value={formatNumber(summary.totalBookmarkCount)}
          description="홈 노출 태그 전체 북마크 합산"
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          title="평균 북마크율"
          value={formatRate(summary.avgBookmarkRate)}
          description="총 북마크 ÷ 총 조회수"
        />
        <KpiCard
          icon={<Trophy className="h-5 w-5" />}
          title="평균 완료율"
          value={formatRate(summary.avgCompletionRate)}
          description="완료 시청 ÷ 총 시청"
        />
      </section>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <>
          <InsightBanner
            topViewTag={insight.topView?.tagName}
            topViewValue={
              insight.topView ? formatNumber(insight.topView.totalViewCount) : "-"
            }
            topBookmarkTag={insight.topBookmark?.tagName}
            topBookmarkValue={
              insight.topBookmark ? formatRate(insight.topBookmark.bookmarkRate) : "-"
            }
            topCompletionTag={insight.topCompletion?.tagName}
            topCompletionValue={
              insight.topCompletion
                ? formatRate(insight.topCompletion.completionRate)
                : "-"
            }
          />

          <SectionCard>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Top Tags</h3>
                <p className="text-sm text-gray-400">
                  핵심 지표별 상위 5개 태그를 빠르게 비교합니다.
                </p>
              </div>
            </div>

            <TopRankingTabs
              activeTab={rankingTab}
              onChange={setRankingTab}
              items={rankingItems}
            />
          </SectionCard>

          <SectionCard>
            <div className="mb-4">
              <h3 className="text-lg font-semibold">태그 성과 차트</h3>
              <p className="text-sm text-gray-400">
                조회수 기준 상위 8개 태그를 비교합니다.
              </p>
            </div>

            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="tagName"
                    stroke="#9CA3AF"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => formatCompactNumber(Number(value))}
                  />
                  <Tooltip
                    formatter={(value) => [formatNumber(Number(value ?? 0)), "조회수"]}
                    contentStyle={{
                        backgroundColor: "#111827",
                        border: "1px solid #374151",
                        borderRadius: "12px",
                        color: "#fff",
                    }}
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  />
                  <Bar dataKey="totalViewCount" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h3 className="text-lg font-semibold">상세 데이터</h3>
                <p className="text-sm text-gray-400">
                  필요할 때만 펼쳐서 검색, 필터, 정렬 기준으로 상세 지표를 확인합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailTable((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
              >
                {showDetailTable ? (
                  <>
                    상세 데이터 접기 <ChevronUp className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    상세 데이터 보기 <ChevronDown className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>

            {showDetailTable && (
              <div className="mt-6">
                <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="flex flex-col gap-3 md:flex-row">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        value={searchKeyword}
                        onChange={(e) => setSearchKeyword(e.target.value)}
                        placeholder="태그 검색"
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-10 pr-4 text-sm text-white md:w-[220px]"
                      />
                    </div>

                    <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
                      <Filter className="h-4 w-4 text-gray-400" />
                      <input
                        type="number"
                        min={0}
                        value={minWatchCount}
                        onChange={(e) =>
                          setMinWatchCount(Number(e.target.value) || 0)
                        }
                        className="w-20 bg-transparent text-sm text-white outline-none"
                      />
                      <span className="text-sm text-gray-400">최소 시청</span>
                    </div>

                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as SortKey)}
                      className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white"
                    >
                      <option value="totalViewCount">조회수순</option>
                      <option value="totalBookmarkCount">북마크순</option>
                      <option value="bookmarkRate">북마크율순</option>
                      <option value="totalWatchCount">시청순</option>
                      <option value="completedWatchCount">완료순</option>
                      <option value="completionRate">완료율순</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full min-w-[920px]">
                    <thead className="bg-gray-800">
                      <tr>
                        <th className="px-5 py-4 text-left text-sm font-semibold">태그</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">조회수</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">북마크</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">북마크율</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">시청</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">완료</th>
                        <th className="px-5 py-4 text-left text-sm font-semibold">완료율</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-800">
                      {sortedStats.length === 0 ? (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-5 py-12 text-center text-sm text-gray-400"
                          >
                            조건에 맞는 태그 데이터가 없습니다.
                          </td>
                        </tr>
                      ) : (
                        sortedStats.map((item, index) => (
                          <tr
                            key={item.tagId}
                            className="transition-colors hover:bg-gray-800/50"
                          >
                            <td className="px-5 py-4 text-sm font-medium text-white">
                              <div className="flex items-center gap-3">
                                {index < 3 && (
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                                    {index + 1}
                                  </span>
                                )}
                                <span>{item.tagName}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {formatNumber(item.totalViewCount)}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {formatNumber(item.totalBookmarkCount)}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              <RateBadge value={formatRate(item.bookmarkRate)} />
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {item.totalWatchCount === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                formatNumber(item.totalWatchCount)
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {item.completedWatchCount === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                formatNumber(item.completedWatchCount)
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm">
                              {item.totalWatchCount === 0 ? (
                                <span className="text-gray-500">-</span>
                              ) : (
                                <RateBadge value={formatRate(item.completionRate)} />
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
};

const SectionCard = ({ children }: { children: React.ReactNode }) => {
  return <section className="rounded-2xl bg-gray-900 p-6">{children}</section>;
};

const KpiCard = ({
  icon,
  title,
  value,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  description: string;
}) => {
  return (
    <div className="rounded-2xl bg-gray-900 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-primary">
        {icon}
      </div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
};

const InsightBanner = ({
  topViewTag,
  topViewValue,
  topBookmarkTag,
  topBookmarkValue,
  topCompletionTag,
  topCompletionValue,
}: {
  topViewTag?: string;
  topViewValue: string;
  topBookmarkTag?: string;
  topBookmarkValue: string;
  topCompletionTag?: string;
  topCompletionValue: string;
}) => {
  return (
    <section className="grid grid-cols-1 gap-3 xl:grid-cols-3">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">Top View</p>
        <p className="mt-2 text-base font-semibold text-white">
          {topViewTag ?? "-"}
        </p>
        <p className="mt-1 text-sm text-primary">{topViewValue}</p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Top Bookmark Rate
        </p>
        <p className="mt-2 text-base font-semibold text-white">
          {topBookmarkTag ?? "-"}
        </p>
        <p className="mt-1 text-sm text-primary">{topBookmarkValue}</p>
      </div>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-5 py-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">
          Top Completion Rate
        </p>
        <p className="mt-2 text-base font-semibold text-white">
          {topCompletionTag ?? "-"}
        </p>
        <p className="mt-1 text-sm text-primary">{topCompletionValue}</p>
      </div>
    </section>
  );
};

const TopRankingTabs = ({
  activeTab,
  onChange,
  items,
}: {
  activeTab: RankingTabKey;
  onChange: (tab: RankingTabKey) => void;
  items: { tagName: string; value: string }[];
}) => {
  const tabs: { key: RankingTabKey; label: string }[] = [
    { key: "views", label: "조회수 TOP 5" },
    { key: "bookmarkRate", label: "북마크율 TOP 5" },
    { key: "completionRate", label: "완료율 TOP 5" },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-primary text-black"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item, index) => (
          <div
            key={`${activeTab}-${item.tagName}`}
            className="rounded-2xl border border-gray-800 bg-gray-800/70 px-4 py-4"
          >
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-sm font-bold text-primary">
              {index + 1}
            </div>
            <p className="truncate text-sm text-gray-400">{item.tagName}</p>
            <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const RateBadge = ({ value }: { value: string }) => {
  return (
    <span className="inline-flex rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
      {value}
    </span>
  );
};

const formatNumber = (value: number) => value.toLocaleString();

const formatRate = (value: number) => `${(value * 100).toFixed(2)}%`;

const formatCompactNumber = (value: number) => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toString();
};

export default HomeTagStatistics;