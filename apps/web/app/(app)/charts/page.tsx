"use client";

import { useEffect, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import type { ProjectionResultDTO } from "@finatlas/engine/src/types";
import NetWorthChart from "@/components/charts/NetWorthChart";
import CashflowChart from "@/components/charts/CashflowChart";
import AssetsLiabilitiesChart from "@/components/charts/AssetsLiabilitiesChart";
import IncomeExpensesChart from "@/components/charts/IncomeExpensesChart";
import SavingsRateChart from "@/components/charts/SavingsRateChart";
import CashBalanceChart from "@/components/charts/CashBalanceChart";

export default function ChartsPage() {
  const { selectedScenario } = useScenario();
  const [projection, setProjection] = useState<ProjectionResultDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recomputing, setRecomputing] = useState(false);

  async function fetchProjection() {
    if (!selectedScenario) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/projections?scenarioId=${selectedScenario.id}`);

      if (!res.ok) {
        throw new Error("Failed to fetch projection data");
      }

      const data = await res.json();
      setProjection(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projection");
    } finally {
      setLoading(false);
      setRecomputing(false);
    }
  }

  useEffect(() => {
    fetchProjection();
  }, [selectedScenario]);

  async function handleRecompute() {
    setRecomputing(true);
    await fetchProjection();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-zinc-400">Loading projection data...</div>
      </div>
    );
  }

  if (error || !projection) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="text-red-400">{error || "No projection data available"}</div>
        <button
          onClick={() => fetchProjection()}
          className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Recompute button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Financial Projections</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Engine {projection.engineVersion} • {projection.inputHash.substring(0, 10)}...
          </p>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="px-4 py-2 rounded-lg bg-zinc-50 hover:bg-white text-zinc-900 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {recomputing ? "Computing..." : "Recompute"}
        </button>
      </div>

      {/* Top row: Net Worth and Cashflow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Net Worth</h2>
          <NetWorthChart series={projection.series?.netWorth || []} height={300} />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Net Cashflow</h2>
          <CashflowChart series={projection.series?.cashflowNet || []} height={300} />
        </div>
      </div>

      {/* Second row: Assets vs Liabilities and Income vs Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Assets vs Liabilities</h2>
          <AssetsLiabilitiesChart
            assetsSeries={projection.series?.assetsTotal || []}
            liabilitiesSeries={projection.series?.liabilitiesTotal || []}
            height={300}
          />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Income vs Expenses</h2>
          <IncomeExpensesChart
            incomeSeries={projection.series?.incomeTotal || []}
            expenseSeries={projection.series?.expenseTotal || []}
            height={300}
          />
        </div>
      </div>

      {/* Third row: Savings Rate and Cash Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Savings Rate (%)</h2>
          <SavingsRateChart
            incomeSeries={projection.series?.incomeTotal || []}
            expenseSeries={projection.series?.expenseTotal || []}
            taxesSeries={projection.series?.taxesTotal || []}
            height={300}
          />
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Projected Cash Balance</h2>
          <CashBalanceChart series={projection.series?.cashflowNet || []} height={300} />
        </div>
      </div>

      {/* Warnings section */}
      {projection.warnings && projection.warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
          <h2 className="text-lg font-medium mb-3 text-amber-400">Warnings</h2>
          <div className="space-y-2">
            {projection.warnings.map((warning, idx) => (
              <div key={idx} className="text-sm text-amber-200/80">
                • {warning.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
