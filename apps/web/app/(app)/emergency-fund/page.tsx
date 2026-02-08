"use client";

import { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";
import {
  calculateEmergencyFund,
  type EmergencyFundResult,
} from "@/lib/emergency/emergencyFundCalculations";

interface DashboardData {
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  netWorth: number;
}

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

export default function EmergencyFundPage() {
  const { selectedScenarioId } = useScenario();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetMonths, setTargetMonths] = useState(6);
  const [monthlySavingsOverride, setMonthlySavingsOverride] = useState(0);

  useEffect(() => {
    if (!selectedScenarioId) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [dashboardRes, accountsRes] = await Promise.all([
          fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`),
          fetch(`/api/accounts?scenarioId=${selectedScenarioId}`),
        ]);

        if (dashboardRes.ok && accountsRes.ok) {
          const dashboardJson = await dashboardRes.json();
          const accountsJson = await accountsRes.json();

          setDashboardData(dashboardJson);
          setAccounts(accountsJson);

          const monthlySavings =
            (dashboardJson.totalAnnualIncome -
              dashboardJson.totalAnnualExpenses) /
            12;
          setMonthlySavingsOverride(Math.max(0, monthlySavings));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedScenarioId]);

  const monthlyExpenses = dashboardData
    ? dashboardData.totalAnnualExpenses / 12
    : 0;

  const liquidAssets = accounts
    .filter((a) => a.type === "SAVINGS" || a.type === "BROKERAGE")
    .reduce((sum, a) => sum + a.balance, 0);

  const result = useMemo(() => {
    if (!dashboardData) return null;
    return calculateEmergencyFund({
      monthlyEssentialExpenses: monthlyExpenses,
      targetMonths,
      currentLiquidAssets: liquidAssets,
      monthlySavings: monthlySavingsOverride,
    });
  }, [
    dashboardData,
    targetMonths,
    monthlySavingsOverride,
    monthlyExpenses,
    liquidAssets,
  ]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!dashboardData || !result) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">
            Unable to load financial data. Please ensure you have expenses and
            accounts configured.
          </p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: EmergencyFundResult["status"]) => {
    switch (status) {
      case "FULLY_FUNDED":
        return "emerald";
      case "PARTIAL":
        return "amber";
      case "CRITICAL":
        return "red";
    }
  };

  const statusColor = getStatusColor(result.status);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">
          Emergency Fund Calculator
        </h1>
        <p className="mt-2 text-zinc-400">
          Ensure you&apos;re prepared for unexpected expenses
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <div className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">
                Target Coverage (months)
              </label>
              <span className="text-sm font-semibold text-emerald-400">
                {targetMonths} months
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={targetMonths}
              onChange={(e) => setTargetMonths(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
            />
            <div className="mt-1 flex justify-between text-xs text-zinc-500">
              <span>1 month</span>
              <span>12 months</span>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-300">
              Monthly Savings Contribution
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                $
              </span>
              <input
                type="number"
                value={monthlySavingsOverride}
                onChange={(e) =>
                  setMonthlySavingsOverride(Math.max(0, Number(e.target.value)))
                }
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800 py-2 pl-7 pr-3 text-sm text-zinc-200 transition-colors focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Target Amount
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-50">
            {formatCurrency(result.targetAmount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Current Liquid Assets
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-50">
            {formatCurrency(result.currentAmount)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            {result.gap > 0 ? "Gap" : "Surplus"}
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              result.gap > 0 ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {formatCurrency(Math.abs(result.gap))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Months Covered
          </div>
          <div className="mt-2 text-2xl font-bold text-zinc-50">
            {result.monthsCovered.toFixed(1)} months
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h3 className="mb-4 text-lg font-semibold text-zinc-50">
          Emergency Fund Progress
        </h3>
        <div className="h-6 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full transition-all duration-500 bg-${statusColor}-500`}
            style={{ width: `${Math.min(100, result.fundedPercentage)}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          {result.fundedPercentage.toFixed(1)}% funded —{" "}
          {formatCurrency(result.currentAmount)} of{" "}
          {formatCurrency(result.targetAmount)}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h3 className="mb-3 text-lg font-semibold text-zinc-50">
          Funding Timeline
        </h3>
        <p className="text-zinc-300">
          {result.status === "FULLY_FUNDED" ? (
            <>
              Your emergency fund is fully funded! You have{" "}
              {result.monthsCovered.toFixed(1)} months of coverage.
            </>
          ) : result.monthsToTarget !== null ? (
            <>
              At {formatCurrency(monthlySavingsOverride)}/month, you&apos;ll
              reach your target in {result.monthsToTarget} months (
              {Math.ceil(result.monthsToTarget / 12)}{" "}
              {Math.ceil(result.monthsToTarget / 12) === 1 ? "year" : "years"})
            </>
          ) : (
            <>
              You&apos;re not currently saving. Start contributing to build your
              emergency fund.
            </>
          )}
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h3 className="mb-3 text-lg font-semibold text-zinc-50">
          What is an Emergency Fund?
        </h3>
        <p className="text-zinc-300">
          An emergency fund covers unexpected expenses like medical bills, car
          repairs, or job loss. Financial experts recommend 3-6 months of
          essential expenses.
        </p>
      </div>
    </div>
  );
}
