"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import CashFlowForecastChart from "@/components/charts/CashFlowForecastChart";
import { formatCurrency } from "@/lib/format";

interface MonthData {
  month: string;
  inflows: number;
  outflows: number;
  netCashFlow: number;
  runningBalance: number;
}

interface Summary {
  avgMonthlyInflow: number;
  avgMonthlyOutflow: number;
  avgNetCashFlow: number;
  projectedSurplus: number;
}

interface CashFlowData {
  months: MonthData[];
  summary: Summary;
}

export default function CashFlowPage() {
  const { selectedScenarioId } = useScenario();
  const [months, setMonths] = useState<6 | 12 | 24>(12);
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCashFlow = useCallback(async () => {
    if (!selectedScenarioId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/cash-flow?scenarioId=${selectedScenarioId}&months=${months}`
      );
      if (!res.ok) throw new Error("Failed to fetch cash flow");
      const result = await res.json();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, months]);

  useEffect(() => {
    fetchCashFlow();
  }, [fetchCashFlow]);

  if (!selectedScenarioId || loading) {
    return <PageSkeleton />;
  }

  const hasData = data && data.months.length > 0;
  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cash Flow Forecast</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Project your monthly cash inflows, outflows, and running balance
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMonths(6)}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
            months === 6
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          6 Months
        </button>
        <button
          onClick={() => setMonths(12)}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
            months === 12
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          12 Months
        </button>
        <button
          onClick={() => setMonths(24)}
          className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${
            months === 24
              ? "bg-emerald-600 text-white"
              : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          24 Months
        </button>
      </div>

      {!hasData && !loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-12 text-center">
          <div className="text-zinc-400 text-sm">
            Add income and expense records to forecast cash flow
          </div>
        </div>
      )}

      {hasData && summary && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">
                Avg Monthly Inflow
              </div>
              <div className="text-xl font-semibold mt-1 text-emerald-400">
                {formatCurrency(summary.avgMonthlyInflow)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">income per month</div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">
                Avg Monthly Outflow
              </div>
              <div className="text-xl font-semibold mt-1 text-red-400">
                {formatCurrency(summary.avgMonthlyOutflow)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">expenses per month</div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                summary.avgNetCashFlow >= 0
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >
              <div className="text-xs text-zinc-400 uppercase tracking-wide">
                Avg Net Cash Flow
              </div>
              <div
                className={`text-xl font-semibold mt-1 ${
                  summary.avgNetCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {summary.avgNetCashFlow >= 0 ? "+" : ""}
                {formatCurrency(summary.avgNetCashFlow)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">per month</div>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                summary.projectedSurplus >= 0
                  ? "border-emerald-500/20 bg-emerald-500/10"
                  : "border-red-500/20 bg-red-500/10"
              }`}
            >
              <div className="text-xs text-zinc-400 uppercase tracking-wide">
                Projected Surplus
              </div>
              <div
                className={`text-xl font-semibold mt-1 ${
                  summary.projectedSurplus >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {summary.projectedSurplus >= 0 ? "+" : ""}
                {formatCurrency(summary.projectedSurplus)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                at end of {months} months
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-lg font-medium mb-4">Forecast Overview</h2>
            <CashFlowForecastChart data={data.months} height={350} />
          </div>

          {/* Monthly breakdown table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
            <div className="p-4 border-b border-zinc-800">
              <h2 className="text-lg font-medium">Monthly Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                    <th className="text-left p-4">Month</th>
                    <th className="text-right p-4">Inflows</th>
                    <th className="text-right p-4">Outflows</th>
                    <th className="text-right p-4">Net</th>
                    <th className="text-right p-4">Running Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((row) => {
                    const monthDate = new Date(row.month + "-01");
                    const monthLabel = monthDate.toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    });
                    return (
                      <tr
                        key={row.month}
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/30"
                      >
                        <td className="p-4 text-sm font-medium text-zinc-200">
                          {monthLabel}
                        </td>
                        <td className="p-4 text-right text-sm text-emerald-400">
                          {formatCurrency(row.inflows)}
                        </td>
                        <td className="p-4 text-right text-sm text-red-400">
                          {formatCurrency(row.outflows)}
                        </td>
                        <td
                          className={`p-4 text-right text-sm font-medium ${
                            row.netCashFlow >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {row.netCashFlow >= 0 ? "+" : ""}
                          {formatCurrency(row.netCashFlow)}
                        </td>
                        <td className="p-4 text-right text-sm text-zinc-300">
                          {formatCurrency(row.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
