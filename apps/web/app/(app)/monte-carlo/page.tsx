"use client";

import { useEffect, useState, useCallback } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import MonteCarloChart from "@/components/charts/MonteCarloChart";
import { formatCurrency, formatPercent } from "@/lib/format";
import type { PercentileBands } from "@finatlas/engine/src/internal/montecarlo";

interface MonteCarloResult {
  bands: PercentileBands[];
  successRate: number;
  goalSuccessRates: Record<string, number>;
  simulations: number;
  medianFinalNetWorth: number;
  p10FinalNetWorth: number;
  p90FinalNetWorth: number;
}

interface GoalInfo {
  id: string;
  name: string;
  targetAmount: number;
}

export default function MonteCarloPage() {
  const { selectedScenarioId } = useScenario();
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [goals, setGoals] = useState<GoalInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulations, setSimulations] = useState(500);
  const [volatility, setVolatility] = useState(15);
  const [hasRun, setHasRun] = useState(false);

  const runSimulation = useCallback(async () => {
    if (!selectedScenarioId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/projections/monte-carlo?scenarioId=${selectedScenarioId}&simulations=${simulations}&volatility=${volatility}`
      );
      if (!res.ok) throw new Error("Failed to run simulation");
      const data = await res.json();
      setResult(data);
      setHasRun(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioId, simulations, volatility]);

  // Fetch goals for goal success table
  useEffect(() => {
    if (!selectedScenarioId) return;
    fetch(`/api/goals?scenarioId=${selectedScenarioId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setGoals(Array.isArray(data) ? data : data.goals || []))
      .catch(() => setGoals([]));
  }, [selectedScenarioId]);

  // Auto-run on first load
  useEffect(() => {
    if (selectedScenarioId && !hasRun) {
      runSimulation();
    }
  }, [selectedScenarioId, hasRun, runSimulation]);

  if (!selectedScenarioId) return <PageSkeleton />;

  const successColor =
    (result?.successRate ?? 0) >= 80
      ? "text-emerald-400"
      : (result?.successRate ?? 0) >= 50
        ? "text-amber-400"
        : "text-red-400";

  const successBg =
    (result?.successRate ?? 0) >= 80
      ? "bg-emerald-500/10 border-emerald-500/20"
      : (result?.successRate ?? 0) >= 50
        ? "bg-amber-500/10 border-amber-500/20"
        : "bg-red-500/10 border-red-500/20";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Monte Carlo Simulation</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Run probabilistic projections to see the range of possible outcomes
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Simulation Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Simulations: {simulations.toLocaleString()}
            </label>
            <input
              type="range"
              min="100"
              max="2000"
              step="100"
              value={simulations}
              onChange={(e) => setSimulations(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>100</span>
              <span>2,000</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-2">
              Volatility: {volatility}%
            </label>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={volatility}
              onChange={(e) => setVolatility(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>5% (Conservative)</span>
              <span>30% (Aggressive)</span>
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={runSimulation}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? "Running..." : "Run Simulation"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && !result && <PageSkeleton />}

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`rounded-2xl border p-4 ${successBg}`}>
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Success Rate</div>
              <div className={`text-3xl font-bold mt-1 ${successColor}`}>
                {result.successRate}%
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                of {result.simulations} simulations
              </div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Median Net Worth</div>
              <div className="text-xl font-semibold mt-1">
                {formatCurrency(result.medianFinalNetWorth)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">50th percentile</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Best Case (P90)</div>
              <div className="text-xl font-semibold mt-1 text-emerald-400">
                {formatCurrency(result.p90FinalNetWorth)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">90th percentile</div>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <div className="text-xs text-zinc-400 uppercase tracking-wide">Worst Case (P10)</div>
              <div className="text-xl font-semibold mt-1 text-amber-400">
                {formatCurrency(result.p10FinalNetWorth)}
              </div>
              <div className="text-xs text-zinc-500 mt-1">10th percentile</div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-lg font-medium mb-4">Net Worth Confidence Bands</h2>
            <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-15" />
                <span>P25–P75</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-emerald-500 opacity-8" />
                <span>P10–P90</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-0.5 bg-emerald-500" />
                <span>Median</span>
              </div>
            </div>
            <MonteCarloChart bands={result.bands} height={300} />
          </div>

          {/* Goal Success Rates */}
          {goals.length > 0 && Object.keys(result.goalSuccessRates).length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
              <h2 className="text-lg font-medium mb-4">Goal Success Rates</h2>
              <div className="space-y-3">
                {goals.map((goal) => {
                  const rate = result.goalSuccessRates[goal.id] ?? 0;
                  const barColor =
                    rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-red-500";
                  return (
                    <div key={goal.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-zinc-300">{goal.name}</span>
                        <span className="text-sm font-medium">
                          {rate}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all`}
                          style={{ width: `${Math.min(rate, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        Target: {formatCurrency(goal.targetAmount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Methodology Note */}
          <div className="text-xs text-zinc-600 pb-4">
            Simulation uses normal distribution with mean return of 7% and {volatility}% annual
            volatility. Each simulation randomizes investment returns while keeping income, expenses,
            and loan payments fixed.
          </div>
        </>
      )}
    </div>
  );
}
