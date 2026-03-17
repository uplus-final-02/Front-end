import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Clock3,
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Trophy,
  Eye,
  Bookmark,
  PlayCircle,
} from "lucide-react";

import { adminService } from "@/services/adminService";
import type {
  AdminMetricsDashboard,
  AdminMetricsDashboardBucketSummary,
  AdminMetricsDashboardTrendingSummary,
  AdminMetricsDashboardVerifySummary,
  AdminTrendingDetailItem,
} from "@/types";
import { ADMIN_JOB_STATUS_MAP } from "@/types";

const TrendingOperations: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminMetricsDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedCalculatedAt, setSelectedCalculatedAt] = useState<string>("");
  const [detailItems, setDetailItems] = useState<AdminTrendingDetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await adminService.getMetricsDashboard();
      setDashboard(data);

      if (!selectedCalculatedAt && data.trendingSummaries.length > 0) {
        setSelectedCalculatedAt(data.trendingSummaries[0].calculatedAt);
      }
    } catch (error) {
      console.error("인기차트 운영 대시보드 조회 실패:", error);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDetail = async (calculatedAt: string) => {
    if (!calculatedAt) return;

    setDetailLoading(true);
    try {
      const data = await adminService.getTrendingDetail({
        calculatedAt,
        limit: 20,
      });
      setDetailItems(data.items);
    } catch (error) {
      console.error("트렌딩 상세 조회 실패:", error);
      setDetailItems([]);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedCalculatedAt) {
      loadDetail(selectedCalculatedAt);
    }
  }, [selectedCalculatedAt]);

  const dashboardSummary = useMemo(() => {
    const bucketSummaries = dashboard?.bucketSummaries ?? [];
    const trendingSummaries = dashboard?.trendingSummaries ?? [];
    const verifySummaries = dashboard?.verifySummaries ?? [];

    const successBuckets = bucketSummaries.filter(
      (item) => item.jobStatus === "SUCCESS",
    ).length;
    const emptyBuckets = bucketSummaries.filter(
      (item) => item.jobStatus === "EMPTY",
    ).length;
    const failedBuckets = bucketSummaries.filter(
      (item) => item.jobStatus === "FAILED",
    ).length;

    const latestTrending = trendingSummaries[0] ?? null;
    const latestVerify = verifySummaries[0] ?? null;

    return {
      successBuckets,
      emptyBuckets,
      failedBuckets,
      latestTrending,
      latestVerify,
    };
  }, [dashboard]);

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold">인기차트 운영 대시보드</h2>
            <p className="mt-2 text-sm text-gray-400">
              최근 24시간 집계 상태, 정각 트렌딩 실행 결과, 검증 요약을 함께 확인합니다.
            </p>
          </div>

          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4" />
            새로고침
          </button>
        </div>
      </SectionCard>

      {loading ? (
        <LoadingSection />
      ) : !dashboard ? (
        <EmptySection message="대시보드 데이터를 불러오지 못했습니다." />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<CheckCircle2 className="h-5 w-5" />}
              title="버킷 성공"
              value={String(dashboardSummary.successBuckets)}
              description="최근 24시간 SUCCESS 버킷 수"
            />
            <KpiCard
              icon={<MinusCircle className="h-5 w-5" />}
              title="버킷 변화 없음"
              value={String(dashboardSummary.emptyBuckets)}
              description="최근 24시간 EMPTY 버킷 수"
            />
            <KpiCard
              icon={<AlertTriangle className="h-5 w-5" />}
              title="버킷 실패"
              value={String(dashboardSummary.failedBuckets)}
              description="최근 24시간 FAILED 버킷 수"
            />
            <KpiCard
              icon={<Trophy className="h-5 w-5" />}
              title="최신 트렌딩 건수"
              value={String(
                dashboardSummary.latestTrending?.trendingHistoryCount ?? 0,
              )}
              description="가장 최근 정각 트렌딩 결과 수"
            />
          </section>

          <SectionCard>
            <div className="mb-5">
              <h3 className="text-lg font-semibold">정각 트렌딩 실행 요약</h3>
              <p className="text-sm text-gray-400">
                최근 정각 기준 트렌딩 실행 상태와 결과 건수를 확인합니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {(dashboard.trendingSummaries ?? []).length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-800/40 px-4 py-10 text-center text-sm text-gray-400">
                  트렌딩 실행 이력이 없습니다.
                </div>
              ) : (
                dashboard.trendingSummaries.map((item) => (
                  <TrendingRunCard
                    key={item.calculatedAt}
                    item={item}
                    selected={selectedCalculatedAt === item.calculatedAt}
                    onSelect={() => setSelectedCalculatedAt(item.calculatedAt)}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5">
              <h3 className="text-lg font-semibold">10분 버킷 요약</h3>
              <p className="text-sm text-gray-400">
                최근 24시간 버킷별 rows 수, delta 합계, 실행 상태를 확인합니다.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold">버킷 시작</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">Rows</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">조회 delta</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">북마크 delta</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">완료 delta</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">상태</th>
                    <th className="px-5 py-4 text-left text-sm font-semibold">메시지</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {(dashboard.bucketSummaries ?? []).length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        버킷 요약 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    dashboard.bucketSummaries.map((item) => (
                      <BucketSummaryRow
                        key={item.bucketStartAt}
                        item={item}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5">
              <h3 className="text-lg font-semibold">검증 요약</h3>
              <p className="text-sm text-gray-400">
                정각별 스냅샷 1시간 합산과 트렌딩 delta 반영 결과를 비교한 요약입니다.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              {(dashboard.verifySummaries ?? []).length === 0 ? (
                <div className="rounded-xl border border-gray-800 bg-gray-800/40 px-4 py-10 text-center text-sm text-gray-400 xl:col-span-3">
                  검증 요약 데이터가 없습니다.
                </div>
              ) : (
                dashboard.verifySummaries.map((item) => (
                  <VerifySummaryCard
                    key={item.calculatedAt}
                    item={item}
                  />
                ))
              )}
            </div>
          </SectionCard>

          <SectionCard>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold">트렌딩 상세</h3>
                <p className="text-sm text-gray-400">
                  선택한 정각 기준 top20 콘텐츠와 점수/증감 지표를 확인합니다.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-xs text-gray-400">
                  기준 정각
                </label>
                <select
                  value={selectedCalculatedAt}
                  onChange={(e) => setSelectedCalculatedAt(e.target.value)}
                  className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white"
                >
                  {(dashboard.trendingSummaries ?? []).map((item) => (
                    <option key={item.calculatedAt} value={item.calculatedAt}>
                      {formatDateTime(item.calculatedAt)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {detailLoading ? (
              <LoadingSection compact />
            ) : detailItems.length === 0 ? (
              <EmptySection message="선택한 정각의 트렌딩 상세 데이터가 없습니다." compact />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full min-w-[1180px]">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold">순위</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">콘텐츠</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">유형</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">점수</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">조회 delta</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">북마크 delta</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">완료 delta</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold">업로더</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {detailItems.map((item) => (
                      <tr
                        key={`${item.contentId}-${item.rank}`}
                        className="transition-colors hover:bg-gray-800/50"
                      >
                        <td className="px-5 py-4 text-sm font-semibold text-white">
                          #{item.rank}
                        </td>
                        <td className="px-5 py-4 text-sm text-white">
                          <div className="flex flex-col">
                            <span className="font-medium">{item.title}</span>
                            <span className="text-xs text-gray-400">
                              contentId: {item.contentId}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          {item.type}
                        </td>
                        <td className="px-5 py-4 text-sm text-white">
                          {formatNumber(item.score)}
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          <MetricDelta
                            icon={<Eye className="h-4 w-4" />}
                            value={item.viewDelta}
                          />
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          <MetricDelta
                            icon={<Bookmark className="h-4 w-4" />}
                            value={item.bookmarkDelta}
                          />
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          <MetricDelta
                            icon={<PlayCircle className="h-4 w-4" />}
                            value={item.completedDelta}
                          />
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          {item.uploaderName
                            ? `${item.uploaderName} (#${item.uploaderId ?? "-"})`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

const TrendingRunCard = ({
  item,
  selected,
  onSelect,
}: {
  item: AdminMetricsDashboardTrendingSummary;
  selected: boolean;
  onSelect: () => void;
}) => {
  const badge = ADMIN_JOB_STATUS_MAP[item.jobStatus];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-2xl border p-5 text-left transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-gray-800 bg-gray-800/50 hover:bg-gray-800"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300">
          <Clock3 className="h-4 w-4" />
          {formatDateTime(item.calculatedAt)}
        </div>
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="text-sm text-gray-300">
        <p>결과 건수: {formatNumber(item.trendingHistoryCount)}</p>
        <p className="mt-1 truncate text-gray-400">
          메시지: {item.message || "-"}
        </p>
      </div>
    </button>
  );
};

const BucketSummaryRow = ({
  item,
}: {
  item: AdminMetricsDashboardBucketSummary;
}) => {
  const badge = ADMIN_JOB_STATUS_MAP[item.jobStatus];

  return (
    <tr className="transition-colors hover:bg-gray-800/50">
      <td className="px-5 py-4 text-sm text-white">
        {formatDateTime(item.bucketStartAt)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.rowsCount)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.viewDeltaSum)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.bookmarkDeltaSum)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.completedDeltaSum)}
      </td>
      <td className="px-5 py-4 text-sm">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-gray-400">
        {item.message || "-"}
      </td>
    </tr>
  );
};

const VerifySummaryCard = ({
  item,
}: {
  item: AdminMetricsDashboardVerifySummary;
}) => {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-800/50 p-5">
      <p className="text-xs uppercase tracking-wide text-gray-400">
        Calculated At
      </p>
      <p className="mt-2 text-base font-semibold text-white">
        {formatDateTime(item.calculatedAt)}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-400">Matched</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatNumber(item.matchedCount)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-400">Mismatched</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatNumber(item.mismatchedCount)}
          </p>
        </div>
      </div>
    </div>
  );
};

const MetricDelta = ({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value: number;
}) => {
  return (
    <div className="inline-flex items-center gap-2">
      <span className="text-gray-500">{icon}</span>
      <span>{formatNumber(value)}</span>
    </div>
  );
};

const LoadingSection = ({ compact = false }: { compact?: boolean }) => {
  return (
    <div className={`flex justify-center ${compact ? "py-8" : "py-16"}`}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
};

const EmptySection = ({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) => {
  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900/60 text-center text-sm text-gray-400 ${
        compact ? "px-4 py-10" : "px-6 py-16"
      }`}
    >
      {message}
    </div>
  );
};

const formatNumber = (value: number) => value.toLocaleString();

const formatDateTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default TrendingOperations;