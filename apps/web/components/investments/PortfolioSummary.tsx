"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

interface AccountAllocation {
  accountType: string;
  value: number;
  percentage: number;
}

interface PortfolioData {
  totalValue: number;
  totalCostBasis: number;
  totalGainLoss: number | null;
  totalGainLossPct: number | null;
  allocation: AccountAllocation[];
}

interface PortfolioSummaryProps {
  scenarioId: string;
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  TRADITIONAL_401K: "401(k)",
  ROTH_401K: "Roth 401(k)",
  TRADITIONAL_IRA: "Trad IRA",
  ROTH_IRA: "Roth IRA",
  BROKERAGE: "Brokerage",
  SAVINGS: "Savings",
  HSA: "HSA",
  "529": "529",
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  TRADITIONAL_401K: "bg-blue-500",
  ROTH_401K: "bg-indigo-500",
  TRADITIONAL_IRA: "bg-purple-500",
  ROTH_IRA: "bg-pink-500",
  BROKERAGE: "bg-emerald-500",
  SAVINGS: "bg-amber-500",
  HSA: "bg-cyan-500",
  "529": "bg-orange-500",
};

export default function PortfolioSummary({ scenarioId }: PortfolioSummaryProps) {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/market/portfolio?scenarioId=${scenarioId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch portfolio data");
      }

      const portfolio = await response.json();
      setData(portfolio);
    } catch (err) {
      console.error("Error fetching portfolio data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scenarioId]);

  const getGainLossColor = (value: number | null): string => {
    if (value === null) return "text-zinc-400";
    if (value > 0) return "text-emerald-400";
    if (value < 0) return "text-red-400";
    return "text-zinc-400";
  };

  const formatGainLoss = (value: number | null): string => {
    if (value === null) return "—";
    if (value > 0) return `+${formatCurrency(value)}`;
    return formatCurrency(value);
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return "—";
    const formatted = value.toFixed(2);
    return value > 0 ? `+${formatted}%` : `${formatted}%`;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 h-24" />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 text-center text-red-400">
        {error || "Failed to load portfolio data"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Portfolio Value</div>
          <div className="text-2xl font-semibold mt-2">{formatCurrency(data.totalValue)}</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Cost Basis</div>
          <div className="text-2xl font-semibold mt-2">
            {data.totalCostBasis > 0 ? formatCurrency(data.totalCostBasis) : "—"}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Gain/Loss</div>
          <div className={`text-2xl font-semibold mt-2 ${getGainLossColor(data.totalGainLoss)}`}>
            {formatGainLoss(data.totalGainLoss)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-lg shadow-black/20 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Return</div>
          <div className={`text-2xl font-semibold mt-2 ${getGainLossColor(data.totalGainLossPct)}`}>
            {formatPercent(data.totalGainLossPct)}
          </div>
        </div>
      </div>

      {/* Asset Allocation */}
      {data.allocation.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-4">
            Asset Allocation
          </h3>

          {/* Bar Chart */}
          <div className="flex h-4 rounded-lg overflow-hidden mb-4">
            {data.allocation.map((item) => (
              <div
                key={item.accountType}
                className={ACCOUNT_TYPE_COLORS[item.accountType] || "bg-zinc-500"}
                style={{ width: `${item.percentage}%` }}
                title={`${ACCOUNT_TYPE_LABELS[item.accountType] || item.accountType}: ${item.percentage.toFixed(1)}%`}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.allocation.map((item) => (
              <div key={item.accountType} className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-sm ${ACCOUNT_TYPE_COLORS[item.accountType] || "bg-zinc-500"}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-zinc-300 truncate">
                    {ACCOUNT_TYPE_LABELS[item.accountType] || item.accountType}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {formatCurrency(item.value)} ({item.percentage.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
