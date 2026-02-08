"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import SpendingTrendsChart from "@/components/charts/SpendingTrendsChart";
import { formatCurrency } from "@/lib/format";

interface TrendsData {
  months: Array<{ month: string; categories: Record<string, number>; total: number }>;
  categoryTotals: Array<{ category: string; total: number; average: number; trend: "up" | "down" | "stable" }>;
  currentMonthTotal: number;
  previousMonthTotal: number;
}

export default function SpendingTrendsPage() {
  const { selectedScenarioId } = useScenario();
  const [monthRange, setMonthRange] = useState<6 | 12 | 24>(12);
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrends = useCallback(async () => {
    if (!selectedScenarioId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/spending-trends?scenarioId=${selectedScenarioId}&months=${monthRange}`);
      if (!res.ok) throw new Error("Failed to fetch trends");
      const trendsData = await res.json();
      setData(trendsData);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, monthRange]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (!selectedScenarioId) return <PageSkeleton />;

  const momChange = data
    ? data.previousMonthTotal > 0
      ? ((data.currentMonthTotal - data.previousMonthTotal) / data.previousMonthTotal) * 100
      : 0
    : 0;

  const topCategory = data && data.categoryTotals.length > 0 ? data.categoryTotals[0] : null;
  const categoryCount = data ? data.categoryTotals.length : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Spending Trends</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Analyze your spending patterns over time
          </p>
        </div>
      </div>

      {/* Month Range Selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-400">Time Period:</span>
        <div className="flex gap-2">
          {([6, 12, 24] as const).map((months) => (
            <button
              key={months}
              onClick={() => setMonthRange(months)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                monthRange === months
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              }`}
            >
              {months} months
            </button>
          ))}
        </div>
      </div>

      {loading && <PageSkeleton />}

      {!loading && data && data.months.length > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">This Month</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(data.currentMonthTotal)}</div>
              <div className="text-xs text-zinc-500 mt-1">total spending</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">MoM Change</div>
              <div
                className={`text-xl font-semibold mt-1 ${
                  momChange < 0 ? "text-emerald-400" : momChange > 0 ? "text-red-400" : "text-zinc-400"
                }`}
              >
                {momChange > 0 ? "+" : ""}
                {momChange.toFixed(1)}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {momChange < 0 ? "spending less" : momChange > 0 ? "spending more" : "no change"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Top Category</div>
              <div className="text-xl font-semibold mt-1 truncate">
                {topCategory ? topCategory.category : "N/A"}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {topCategory ? formatCurrency(topCategory.total) : "no data"}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Categories</div>
              <div className="text-xl font-semibold mt-1">{categoryCount}</div>
              <div className="text-xs text-zinc-500 mt-1">tracked</div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-medium mb-4">Spending Over Time</h2>
            <SpendingTrendsChart data={data.months} height={350} />
          </div>

          {/* Category Breakdown Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium">Category Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                    <th className="text-left p-4">Category</th>
                    <th className="text-right p-4">Total ({monthRange}mo)</th>
                    <th className="text-right p-4">Average</th>
                    <th className="text-center p-4">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {data.categoryTotals.map((category) => (
                    <tr key={category.category} className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                      <td className="p-4">
                        <div className="text-sm font-medium text-zinc-200">{category.category}</div>
                      </td>
                      <td className="p-4 text-right text-sm text-zinc-300">
                        {formatCurrency(category.total)}
                      </td>
                      <td className="p-4 text-right text-sm text-zinc-300">
                        {formatCurrency(category.average)}
                      </td>
                      <td className="p-4 text-center">
                        {category.trend === "up" && (
                          <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                            </svg>
                            Up
                          </span>
                        )}
                        {category.trend === "down" && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                            </svg>
                            Down
                          </span>
                        )}
                        {category.trend === "stable" && (
                          <span className="inline-flex items-center gap-1 text-zinc-400 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                            </svg>
                            Stable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && (!data || data.months.length === 0) && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 text-sm">
            No spending data yet. Start tracking actual expenses in the Budget page.
          </div>
        </div>
      )}
    </div>
  );
}
