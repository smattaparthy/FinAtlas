"use client";

import { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import FireProjectionChart from "@/components/charts/FireProjectionChart";
import { formatCurrency } from "@/lib/format";
import { calculateFire, type FireResult } from "@/lib/fire/fireCalculations";

interface DashboardData {
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  netWorth: number;
  goalsProgress: number;
  goalsCount: number;
}

export default function FireCalculatorPage() {
  const { selectedScenarioId } = useScenario();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // User-adjustable parameters
  const [retirementExpenses, setRetirementExpenses] = useState<number>(0);
  const [expectedReturn, setExpectedReturn] = useState<number>(7);
  const [withdrawalRate, setWithdrawalRate] = useState<number>(4);
  const [inflationRate, setInflationRate] = useState<number>(2.5);

  // Fetch dashboard data
  useEffect(() => {
    if (!selectedScenarioId) return;
    setLoading(true);
    fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setDashboardData(data);
      })
      .catch(() => setDashboardData(null))
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  // Initialize retirement expenses from data
  useEffect(() => {
    if (dashboardData) {
      setRetirementExpenses(Math.round(dashboardData.totalAnnualExpenses * 0.8));
    }
  }, [dashboardData]);

  // Compute FIRE result
  const fireResult: FireResult | null = useMemo(() => {
    if (!dashboardData) return null;

    const annualSavings =
      dashboardData.totalAnnualIncome - dashboardData.totalAnnualExpenses;

    return calculateFire({
      currentNetWorth: dashboardData.netWorth,
      annualIncome: dashboardData.totalAnnualIncome,
      annualExpenses: dashboardData.totalAnnualExpenses,
      annualSavings,
      retirementAnnualExpenses: retirementExpenses,
      expectedReturnRate: expectedReturn / 100,
      withdrawalRate: withdrawalRate / 100,
      inflationRate: inflationRate / 100,
    });
  }, [dashboardData, retirementExpenses, expectedReturn, withdrawalRate, inflationRate]);

  if (!selectedScenarioId || loading) return <PageSkeleton />;

  if (!dashboardData || !fireResult) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">FIRE Calculator</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Calculate your path to Financial Independence, Retire Early
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
          Unable to load financial data. Please ensure you have income and expenses configured.
        </div>
      </div>
    );
  }

  const progressColor =
    fireResult.currentProgress > 0.75
      ? "text-emerald-400"
      : fireResult.currentProgress > 0.5
        ? "text-amber-400"
        : "text-red-400";

  const savingsColor =
    fireResult.savingsRate > 0.5
      ? "text-emerald-400"
      : fireResult.savingsRate > 0.2
        ? "text-amber-400"
        : "text-red-400";

  const progressBarColor =
    fireResult.currentProgress > 0.75
      ? "bg-emerald-500"
      : fireResult.currentProgress > 0.5
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">FIRE Calculator</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Calculate your path to Financial Independence, Retire Early
        </p>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Annual Expenses in Retirement */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Annual Expenses in Retirement
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={retirementExpenses || ""}
                onChange={(e) =>
                  setRetirementExpenses(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
          </div>

          {/* Expected Annual Return */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Expected Annual Return
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="3"
                max="12"
                step="0.5"
                value={expectedReturn}
                onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {expectedReturn}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>3%</span>
              <span>12%</span>
            </div>
          </div>

          {/* Safe Withdrawal Rate */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Safe Withdrawal Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="6"
                step="0.25"
                value={withdrawalRate}
                onChange={(e) => setWithdrawalRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {withdrawalRate}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>2%</span>
              <span>6%</span>
            </div>
          </div>

          {/* Inflation Rate */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Inflation Rate
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="5"
                step="0.25"
                value={inflationRate}
                onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-12 text-right">
                {inflationRate}%
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>0%</span>
              <span>5%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* FI Number */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">FI Number</div>
          <div className="text-xl font-semibold">{formatCurrency(fireResult.fiNumber)}</div>
          <div className="text-xs text-zinc-600 mt-1">
            Annual expenses / withdrawal rate
          </div>
        </div>

        {/* Progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Progress</div>
          <div className={`text-xl font-semibold ${progressColor}`}>
            {(fireResult.currentProgress * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Current net worth / FI number
          </div>
        </div>

        {/* Years to FI */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Years to FI</div>
          <div className="text-xl font-semibold">
            {fireResult.yearsToFI <= 0 ? (
              <span className="text-emerald-400">Already FI!</span>
            ) : fireResult.yearsToFI === Infinity ? (
              <span className="text-red-400">Not achievable</span>
            ) : (
              `${fireResult.yearsToFI.toFixed(1)} years`
            )}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            {fireResult.fiDate
              ? `Target: ${new Date(fireResult.fiDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
              : "Based on current savings rate"}
          </div>
        </div>

        {/* Savings Rate */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Savings Rate</div>
          <div className={`text-xl font-semibold ${savingsColor}`}>
            {(fireResult.savingsRate * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Annual savings / annual income
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <div className="text-sm font-medium text-zinc-300 mb-3">Progress to Financial Independence</div>
        <div className="w-full h-4 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
            style={{ width: `${Math.min(fireResult.currentProgress * 100, 100)}%` }}
          />
        </div>
        <div className="text-xs text-zinc-500 mt-2">
          {formatCurrency(dashboardData.netWorth)} of {formatCurrency(fireResult.fiNumber)}
        </div>
      </div>

      {/* Projection Chart */}
      {fireResult.monthlyProjection.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">FIRE Projection</h2>
          <FireProjectionChart
            projection={fireResult.monthlyProjection}
            height={350}
          />
        </div>
      )}

      {/* Coast FIRE Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-2">Coast FIRE Number</h2>
        <div className="text-2xl font-semibold mb-2">
          {fireResult.coastFireNumber > 0
            ? formatCurrency(fireResult.coastFireNumber)
            : "N/A"}
        </div>
        <p className="text-xs text-zinc-400 mb-3">
          The amount you need today, invested at {expectedReturn}%, to reach your FI number
          without saving another dollar.
        </p>
        {fireResult.coastFireNumber > 0 &&
          fireResult.coastFireNumber <= dashboardData.netWorth && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <svg
                className="w-4 h-4 text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-emerald-400">
                You&apos;ve reached Coast FIRE!
              </span>
            </div>
          )}
      </div>

      {/* Methodology Note */}
      <div className="text-xs text-zinc-600 pb-4">
        Based on the 4% rule from the Trinity Study. FI Number = Annual Retirement Expenses /
        Safe Withdrawal Rate. Projections assume constant real returns and do not account for
        sequence of returns risk.
      </div>
    </div>
  );
}
