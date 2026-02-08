"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import AllocationChart from "@/components/charts/AllocationChart";
import { formatCurrency } from "@/lib/format";
import {
  calculateAllocations,
  RISK_PROFILES,
  type RiskProfile,
  type RebalanceResult,
} from "@/lib/rebalancing/rebalancingCalculations";

type Account = {
  id: string;
  name: string;
  type: string;
  balance: number;
  holdings: Array<{ id: string; symbol: string; name: string; shares: number; costBasis: number }>;
  contributions: Array<any>;
};

const ACCOUNT_TYPE_COLORS: Record<string, string> = {
  TRADITIONAL_401K: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ROTH_401K: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  TRADITIONAL_IRA: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  ROTH_IRA: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  BROKERAGE: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  SAVINGS: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  HSA: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  "529": "bg-pink-500/20 text-pink-400 border-pink-500/30",
};

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

export default function RebalancingPage() {
  const { selectedScenarioId } = useScenario();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<"conservative" | "moderate" | "aggressive" | "custom">("moderate");
  const [customProfile, setCustomProfile] = useState<RiskProfile>({ stocks: 60, bonds: 30, cash: 10 });

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchAccounts() {
      setLoading(true);
      try {
        const res = await fetch(`/api/accounts?scenarioId=${selectedScenarioId}`);
        if (!res.ok) {
          throw new Error("Failed to fetch accounts");
        }
        const data = await res.json();
        setAccounts(data.accounts || []);
      } catch (err) {
        console.error("Error fetching accounts:", err);
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchAccounts();
  }, [selectedScenarioId]);

  const result = useMemo<RebalanceResult | null>(() => {
    if (accounts.length === 0) return null;
    const profile = selectedProfile === "custom" ? customProfile : RISK_PROFILES[selectedProfile];
    return calculateAllocations(accounts, profile);
  }, [accounts, selectedProfile, customProfile]);

  const customProfileSum = customProfile.stocks + customProfile.bonds + customProfile.cash;
  const customProfileValid = customProfileSum === 100;

  const getColorIndicator = (currentPct: number, targetPct: number) => {
    const diff = Math.abs(currentPct - targetPct);
    if (diff < 2) return "text-emerald-400";
    if (diff < 5) return "text-amber-400";
    return "text-red-400";
  };

  const getDriftColor = (driftScore: number) => {
    if (driftScore < 5) return { color: "text-emerald-400", label: "Well Balanced" };
    if (driftScore < 15) return { color: "text-amber-400", label: "Slightly Off" };
    return { color: "text-red-400", label: "Needs Rebalancing" };
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Investment Rebalancing</h1>
        <p className="text-zinc-400 text-sm mt-1">Optimize your portfolio allocation</p>
      </div>

      {/* Risk Profile Selector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-medium mb-4">Target Allocation</h2>
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedProfile("conservative")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProfile === "conservative"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Conservative
          </button>
          <button
            onClick={() => setSelectedProfile("moderate")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProfile === "moderate"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Moderate
          </button>
          <button
            onClick={() => setSelectedProfile("aggressive")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProfile === "aggressive"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Aggressive
          </button>
          <button
            onClick={() => setSelectedProfile("custom")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedProfile === "custom"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Custom
          </button>
        </div>

        {selectedProfile === "custom" && (
          <div>
            <div className="flex gap-4 mb-2">
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Stocks %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customProfile.stocks}
                  onChange={(e) => setCustomProfile({ ...customProfile, stocks: Number(e.target.value) })}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Bonds %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customProfile.bonds}
                  onChange={(e) => setCustomProfile({ ...customProfile, bonds: Number(e.target.value) })}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-zinc-400">Cash %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customProfile.cash}
                  onChange={(e) => setCustomProfile({ ...customProfile, cash: Number(e.target.value) })}
                  className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            {!customProfileValid && (
              <p className="text-red-400 text-sm">Allocations must sum to 100% (currently {customProfileSum}%)</p>
            )}
          </div>
        )}
      </div>

      {!result ? (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center">
          <div className="text-zinc-400 mb-4">No investment accounts found. Add accounts to analyze your portfolio allocation.</div>
          <Link
            href="/investments/new"
            className="text-emerald-400 hover:underline"
          >
            Add Investment Account
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Portfolio</div>
              <div className="text-2xl font-semibold mt-1">{formatCurrency(result.totalValue)}</div>
            </div>
            {result.allocations.map((allocation) => (
              <div key={allocation.assetClass} className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
                <div className="text-xs text-zinc-400 uppercase tracking-wide">{allocation.assetClass}</div>
                <div className={`text-2xl font-semibold mt-1 ${getColorIndicator(allocation.currentPct, allocation.targetPct)}`}>
                  {allocation.currentPct.toFixed(1)}%
                </div>
                <div className="text-xs text-zinc-500">Target: {allocation.targetPct.toFixed(1)}%</div>
              </div>
            ))}
          </div>

          {/* Allocation Chart & Drift Score */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <AllocationChart allocations={result.allocations} totalValue={result.totalValue} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="text-sm text-zinc-400 mb-2">Portfolio Drift Score</div>
                <div className={`text-5xl font-bold ${getDriftColor(result.driftScore).color}`}>
                  {result.driftScore.toFixed(1)}
                </div>
                <div className={`text-sm mt-2 ${getDriftColor(result.driftScore).color}`}>
                  {getDriftColor(result.driftScore).label}
                </div>
              </div>
            </div>
          </div>

          {/* Rebalancing Summary Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-medium mb-4">Rebalancing Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-400 uppercase tracking-wide pb-3">Asset Class</th>
                    <th className="text-right text-xs text-zinc-400 uppercase tracking-wide pb-3">Current %</th>
                    <th className="text-right text-xs text-zinc-400 uppercase tracking-wide pb-3">Target %</th>
                    <th className="text-right text-xs text-zinc-400 uppercase tracking-wide pb-3">Difference</th>
                    <th className="text-center text-xs text-zinc-400 uppercase tracking-wide pb-3">Action</th>
                    <th className="text-right text-xs text-zinc-400 uppercase tracking-wide pb-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.allocations.map((allocation) => (
                    <tr key={allocation.assetClass} className="border-b border-zinc-800/50">
                      <td className="py-3 font-medium">{allocation.assetClass}</td>
                      <td className="py-3 text-right">{allocation.currentPct.toFixed(1)}%</td>
                      <td className="py-3 text-right">{allocation.targetPct.toFixed(1)}%</td>
                      <td className={`py-3 text-right ${allocation.difference > 0 ? "text-red-400" : allocation.difference < 0 ? "text-emerald-400" : "text-zinc-400"}`}>
                        {allocation.difference > 0 ? "+" : ""}{allocation.difference.toFixed(1)}%
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            allocation.action === "BUY"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : allocation.action === "SELL"
                              ? "bg-red-500/10 text-red-400"
                              : "bg-zinc-500/10 text-zinc-400"
                          }`}
                        >
                          {allocation.action}
                        </span>
                      </td>
                      <td className="py-3 text-right">{formatCurrency(allocation.adjustAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Account Breakdown */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
            <h2 className="text-lg font-medium mb-4">Account Classification</h2>
            <div className="space-y-3">
              {accounts.map((account) => {
                const assetClass = account.type === "SAVINGS" ? "Cash" : "Stocks";
                return (
                  <div key={account.id} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-lg border ${
                          ACCOUNT_TYPE_COLORS[account.type] || "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }`}
                      >
                        {ACCOUNT_TYPE_LABELS[account.type] || account.type}
                      </span>
                      <div>
                        <div className="font-medium">{account.name}</div>
                        <div className="text-xs text-zinc-500">{formatCurrency(account.balance)}</div>
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">→ {assetClass}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
