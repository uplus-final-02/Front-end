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
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { adminService } from "@/services/adminService";
import type {
  AdminMetricsDashboard,
  AdminMetricsDashboardBucketItem,
  AdminMetricsDashboardHourItem,
  AdminTrendingDetailItem,
} from "@/types";
import { ADMIN_JOB_STATUS_MAP } from "@/types";

const TrendingOperations: React.FC = () => {
  const [dashboard, setDashboard] = useState<AdminMetricsDashboard | null>(null);
  const [loading, setLoading] = useState(false);

  const [selectedCalculatedAt, setSelectedCalculatedAt] = useState<string>("");
  const [detailItems, setDetailItems] = useState<AdminTrendingDetailItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [showAllBuckets, setShowAllBuckets] = useState(false);
  const [hoursPanelCollapsed, setHoursPanelCollapsed] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const data = await adminService.getMetricsDashboard();
      setDashboard(data);

      if (!selectedCalculatedAt && data.hours.length > 0) {
        setSelectedCalculatedAt(data.hours[0].calculatedAt);
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

      const normalizedItems = (data.items ?? []).map((item: any) => ({
        ...item,
        score: item.score ?? 0,
        viewDelta: item.viewDelta ?? 0,
        bookmarkDelta: item.bookmarkDelta ?? 0,
        completedDelta: item.completedDelta ?? 0,
      }));

      setDetailItems(normalizedItems);
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

  const selectedHour = useMemo(() => {
    if (!dashboard?.hours?.length) return null;
    return (
      dashboard.hours.find(
        (item) => item.calculatedAt === selectedCalculatedAt,
      ) ??
      dashboard.hours[0] ??
      null
    );
  }, [dashboard, selectedCalculatedAt]);

  const dashboardSummary = useMemo(() => {
    const buckets = dashboard?.buckets ?? [];
    const hours = dashboard?.hours ?? [];

    const successBuckets = buckets.filter(
      (item) => item.jobStatus === "SUCCESS",
    ).length;
    const emptyBuckets = buckets.filter(
      (item) => item.jobStatus === "EMPTY",
    ).length;
    const failedBuckets = buckets.filter(
      (item) => item.jobStatus === "FAILED",
    ).length;

    const latestTrending = hours[0] ?? null;
    const mismatchHours = hours.filter((item) => item.mismatch).length;

    return {
      successBuckets,
      emptyBuckets,
      failedBuckets,
      latestTrending,
      mismatchHours,
    };
  }, [dashboard]);

  const visibleBuckets = useMemo(() => {
    const buckets = dashboard?.buckets ?? [];
    return showAllBuckets ? buckets : buckets.slice(0, 5);
  }, [dashboard, showAllBuckets]);

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              인기차트 운영 대시보드
            </h2>
            <p className="mt-2 text-sm text-gray-400">
              최근 24시간 스냅샷 버킷, 정각 트렌딩 실행 결과, 상세 순위를
              한 화면에서 확인합니다.
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
              icon={<AlertTriangle className="h-5 w-5" />}
              title="버킷 실패"
              value={String(dashboardSummary.failedBuckets)}
              description="최근 24시간 FAILED 버킷 수"
            />
            <KpiCard
              icon={<Trophy className="h-5 w-5" />}
              title="최신 트렌딩 건수"
              value={String(
                dashboardSummary.latestTrending?.trendingRowsCount ?? 0,
              )}
              description="가장 최근 정각 실행 결과 수"
            />
            <KpiCard
              icon={<MinusCircle className="h-5 w-5" />}
              title="불일치 정각"
              value={String(dashboardSummary.mismatchHours)}
              description="snapshot 합계와 차이가 있는 정각 수"
            />
          </section>

          <section
  className="grid grid-cols-1 gap-6 xl:grid-cols-[auto_minmax(0,1fr)]"
>
  <SectionCard
      className={`overflow-hidden transition-all duration-300 ${
        hoursPanelCollapsed ? "xl:w-[72px]" : "xl:w-[340px]"
      }`}
    >
      <div
        className={`mb-4 flex ${
          hoursPanelCollapsed
            ? "flex-col items-center gap-3"
            : "items-start justify-between gap-3"
        }`}
      >
        {hoursPanelCollapsed ? (
          <>
            <button
              type="button"
              onClick={() => setHoursPanelCollapsed(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-white transition hover:bg-gray-700"
              aria-label="정각 실행 목록 펼치기"
              title="정각 실행 목록 펼치기"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="writing-mode-vertical text-xs tracking-wide text-gray-400 [writing-mode:vertical-rl]">
              정각 실행 목록
            </div>
          </>
        ) : (
          <>
            <div>
              <h3 className="text-lg font-semibold text-white">
                정각 실행 목록
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                시간대를 선택하면 우측에 상세 결과와 검증 정보를 보여줍니다.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setHoursPanelCollapsed(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-white transition hover:bg-gray-700"
              aria-label="정각 실행 목록 접기"
              title="정각 실행 목록 접기"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {!hoursPanelCollapsed && (
        <div className="space-y-3">
          {(dashboard.hours ?? []).length === 0 ? (
            <EmptySection
              message="트렌딩 실행 이력이 없습니다."
              compact
            />
          ) : (
            dashboard.hours.map((item) => (
              <HourListItem
                key={item.calculatedAt}
                item={item}
                selected={selectedCalculatedAt === item.calculatedAt}
                onSelect={() => setSelectedCalculatedAt(item.calculatedAt)}
              />
            ))
          )}
        </div>
      )}
    </SectionCard>

    <SectionCard className="min-w-0">
      {!selectedHour ? (
        <EmptySection
          message="선택 가능한 정각 데이터가 없습니다."
          compact
        />
      ) : (
        <SelectedHourSummary item={selectedHour} />
      )}
    </SectionCard>
  </section>

          <SectionCard>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  트렌딩 상세
                </h3>
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
                  {(dashboard.hours ?? []).map((item) => (
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
              <EmptySection
                message="선택한 정각의 트렌딩 상세 데이터가 없습니다."
                compact
              />
            ) : (
              <div className="overflow-x-auto rounded-xl border border-gray-800">
                <table className="w-full min-w-[1180px]">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        순위
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        콘텐츠
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        점수
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        조회 delta
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        북마크 delta
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        완료 delta
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        유형
                      </th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                        업로더
                      </th>
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
                          {item.type}
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

          <SectionCard>
            <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  10분 버킷 요약
                </h3>
                <p className="text-sm text-gray-400">
                  최근 24시간 버킷별 rows 수, delta 합계, 실행 상태를 확인합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAllBuckets((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
              >
                {showAllBuckets ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    최근 5건만 보기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    전체 보기
                  </>
                )}
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full min-w-[980px]">
                <thead className="bg-gray-800">
                  <tr>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      버킷 시작
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      Rows
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      조회 delta
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      북마크 delta
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      완료 delta
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      상태
                    </th>
                    <th className="px-5 py-4 text-left text-sm font-semibold text-white">
                      메시지
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {visibleBuckets.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm text-gray-400"
                      >
                        버킷 요약 데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    visibleBuckets.map((item) => (
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
        </>
      )}
    </div>
  );
};

const SectionCard = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <section
      className={`rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-sm ${className}`}
    >
      {children}
    </section>
  );
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
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gray-800 text-primary">
        {icon}
      </div>
      <p className="text-sm text-gray-400">{title}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-xs text-gray-500">{description}</p>
    </div>
  );
};

const HourListItem = ({
  item,
  selected,
  onSelect,
}: {
  item: AdminMetricsDashboardHourItem;
  selected: boolean;
  onSelect: () => void;
}) => {
  const badge = ADMIN_JOB_STATUS_MAP[item.jobStatus];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border px-4 py-3 text-left transition ${
        selected
          ? "border-primary bg-primary/10"
          : "border-gray-800 bg-gray-800/40 hover:bg-gray-800"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Clock3 className="h-4 w-4 text-gray-400" />
            <span className="truncate">{formatDateTime(item.calculatedAt)}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            결과 건수 {formatNumber(item.trendingRowsCount)}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.color}`}
          >
            {badge.label}
          </span>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
              item.mismatch
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {item.mismatch ? "불일치" : "일치"}
          </span>
        </div>
      </div>
    </button>
  );
};

const SelectedHourSummary = ({
  item,
}: {
  item: AdminMetricsDashboardHourItem;
}) => {
  const badge = ADMIN_JOB_STATUS_MAP[item.jobStatus];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm text-gray-400">선택한 정각</p>
          <h3 className="mt-1 text-xl font-bold text-white">
            {formatDateTime(item.calculatedAt)}
          </h3>
          <p className="mt-2 text-sm text-gray-400">
            {item.jobMessage || "-"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
          >
            {badge.label}
          </span>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              item.mismatch
                ? "bg-red-500/20 text-red-400"
                : "bg-green-500/20 text-green-400"
            }`}
          >
            {item.mismatch ? "불일치" : "일치"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <MiniStat label="트렌딩 건수" value={item.trendingRowsCount} />
        <MiniStat label="트렌딩 조회" value={item.trendingSumDeltaView} />
        <MiniStat
          label="트렌딩 북마크"
          value={item.trendingSumDeltaBookmark}
        />
        <MiniStat
          label="트렌딩 완료"
          value={item.trendingSumDeltaCompleted}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <CompareBlock
          title="조회수 비교"
          leftLabel="Trending"
          leftValue={item.trendingSumDeltaView}
          rightLabel="Snapshot"
          rightValue={item.snapshotSumDeltaView}
        />
        <CompareBlock
          title="북마크 비교"
          leftLabel="Trending"
          leftValue={item.trendingSumDeltaBookmark}
          rightLabel="Snapshot"
          rightValue={item.snapshotSumDeltaBookmark}
        />
        <CompareBlock
          title="완료수 비교"
          leftLabel="Trending"
          leftValue={item.trendingSumDeltaCompleted}
          rightLabel="Snapshot"
          rightValue={item.snapshotSumDeltaCompleted}
        />
      </div>
    </div>
  );
};

const MiniStat = ({
  label,
  value,
}: {
  label: string;
  value?: number | null;
}) => {
  return (
    <div className="rounded-xl bg-gray-800/60 px-4 py-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{formatNumber(value)}</p>
    </div>
  );
};

const CompareBlock = ({
  title,
  leftLabel,
  leftValue,
  rightLabel,
  rightValue,
}: {
  title: string;
  leftLabel: string;
  leftValue?: number | null;
  rightLabel: string;
  rightValue?: number | null;
}) => {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-800/40 p-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-400">{leftLabel}</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatNumber(leftValue)}
          </p>
        </div>
        <div className="rounded-xl bg-gray-900 px-4 py-3">
          <p className="text-xs text-gray-400">{rightLabel}</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatNumber(rightValue)}
          </p>
        </div>
      </div>
    </div>
  );
};

const BucketSummaryRow = ({
  item,
}: {
  item: AdminMetricsDashboardBucketItem;
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
        {formatNumber(item.sumDeltaView)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.sumDeltaBookmark)}
      </td>
      <td className="px-5 py-4 text-sm text-gray-300">
        {formatNumber(item.sumDeltaCompleted)}
      </td>
      <td className="px-5 py-4 text-sm">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${badge.color}`}
        >
          {badge.label}
        </span>
      </td>
      <td className="px-5 py-4 text-sm text-gray-400">
        {item.jobMessage || "-"}
      </td>
    </tr>
  );
};

const MetricDelta = ({
  icon,
  value,
}: {
  icon: React.ReactNode;
  value?: number | null;
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

const formatNumber = (value?: number | null) => (value ?? 0).toLocaleString();

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