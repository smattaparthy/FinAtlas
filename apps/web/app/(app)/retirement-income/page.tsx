"use client";

import { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import SSComparisonTable from "@/components/retirement/SSComparisonTable";
import WithdrawalChart from "@/components/retirement/WithdrawalChart";
import IncomeProjectionTable from "@/components/retirement/IncomeProjectionTable";
import { formatCurrency } from "@/lib/format";
import {
  calculateRetirementIncome,
  type RetirementIncomeResult,
} from "@/lib/retirement/retirementIncomeCalculations";

interface AccountData {
  id: string;
  name: string;
  type: string;
  balance: number;
  growthRate: number | null;
}

export default function RetirementIncomePage() {
  const { selectedScenarioId } = useScenario();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // User-adjustable parameters
  const [currentAge, setCurrentAge] = useState(40);
  const [retirementAge, setRetirementAge] = useState(65);
  const [ssMonthlyBenefit, setSsMonthlyBenefit] = useState(2000);
  const [ssClaimAge, setSsClaimAge] = useState(67);
  const [pensionAnnual, setPensionAnnual] = useState(0);
  const [annualSpending, setAnnualSpending] = useState(60000);

  // Fetch accounts for pre-population
  useEffect(() => {
    if (!selectedScenarioId) return;
    setLoading(true);
    fetch(`/api/accounts?scenarioId=${selectedScenarioId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.accounts) {
          setAccounts(data.accounts);
        }
      })
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  // Build account balances from fetched data
  const accountBalances = useMemo(() => {
    return accounts.map((a) => ({
      type: a.type,
      balance: a.balance,
      returnRate: a.growthRate ?? 0.07,
    }));
  }, [accounts]);

  // Compute retirement income result
  const result: RetirementIncomeResult | null = useMemo(() => {
    const birthYear = new Date().getFullYear() - currentAge;
    return calculateRetirementIncome({
      currentAge,
      retirementAge,
      ssMonthlyBenefit,
      ssClaimAge,
      birthYear,
      pensionAnnual,
      accountBalances:
        accountBalances.length > 0
          ? accountBalances
          : [
              { type: "BROKERAGE", balance: 100000, returnRate: 0.07 },
              { type: "401K", balance: 200000, returnRate: 0.07 },
              { type: "ROTH_IRA", balance: 50000, returnRate: 0.07 },
            ],
      annualSpending,
    });
  }, [
    currentAge,
    retirementAge,
    ssMonthlyBenefit,
    ssClaimAge,
    pensionAnnual,
    accountBalances,
    annualSpending,
  ]);

  if (!selectedScenarioId || loading) return <PageSkeleton />;

  if (!result) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Retirement Income Strategies</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Social Security optimization, withdrawal planning, and income projection
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8 text-center text-zinc-500">
          Unable to compute retirement projections. Please check your inputs.
        </div>
      </div>
    );
  }

  // Summary metrics
  const yearsOfCoverage = result.projection.filter(
    (p) => p.accountWithdrawals > 0 || p.ssIncome + p.pensionIncome >= p.totalIncome * 0.95
  ).length;

  const avgNetIncome =
    result.projection.length > 0
      ? result.projection.reduce((s, p) => s + p.netIncome, 0) /
        result.projection.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Retirement Income Strategies</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Social Security optimization, withdrawal planning, and income projection
        </p>
      </div>

      {/* Input Panel */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Parameters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Current Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Current Age
            </label>
            <input
              type="number"
              min="25"
              max="80"
              value={currentAge || ""}
              onChange={(e) =>
                setCurrentAge(Math.max(25, Math.min(80, parseInt(e.target.value) || 25)))
              }
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Retirement Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Retirement Age
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="55"
                max="75"
                step="1"
                value={retirementAge}
                onChange={(e) => setRetirementAge(parseInt(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <span className="text-sm font-medium text-zinc-200 w-10 text-right">
                {retirementAge}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>55</span>
              <span>75</span>
            </div>
          </div>

          {/* SS Monthly Benefit at FRA */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              SS Monthly Benefit at FRA
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="100"
                value={ssMonthlyBenefit || ""}
                onChange={(e) =>
                  setSsMonthlyBenefit(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="2000"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* SS Claim Age */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              SS Claim Age
            </label>
            <select
              value={ssClaimAge}
              onChange={(e) => setSsClaimAge(parseInt(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
            >
              <option value={62}>62 (Early - reduced benefits)</option>
              <option value={67}>67 (Full Retirement Age)</option>
              <option value={70}>70 (Delayed - maximum benefits)</option>
            </select>
          </div>

          {/* Annual Pension */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Annual Pension
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={pensionAnnual || ""}
                onChange={(e) =>
                  setPensionAnnual(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="0"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Annual Retirement Spending */}
          <div>
            <label className="block text-xs text-zinc-400 mb-1.5">
              Annual Retirement Spending
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                $
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={annualSpending || ""}
                onChange={(e) =>
                  setAnnualSpending(Math.max(0, parseFloat(e.target.value) || 0))
                }
                placeholder="60000"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-50 focus:border-emerald-500 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Lifetime Income */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Total Lifetime Net Income</div>
          <div className="text-xl font-semibold text-emerald-400">
            {formatCurrency(result.totalLifetimeIncome)}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Age {retirementAge} through 95
          </div>
        </div>

        {/* Years of Coverage */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Years of Full Coverage</div>
          <div
            className={`text-xl font-semibold ${
              yearsOfCoverage >= 25 ? "text-emerald-400" : yearsOfCoverage >= 15 ? "text-amber-400" : "text-red-400"
            }`}
          >
            {yearsOfCoverage} years
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            Before account depletion
          </div>
        </div>

        {/* Average Annual Net Income */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="text-xs text-zinc-500 mb-1">Avg Annual Net Income</div>
          <div className="text-xl font-semibold">
            {formatCurrency(Math.round(avgNetIncome))}
          </div>
          <div className="text-xs text-zinc-600 mt-1">
            After estimated taxes
          </div>
        </div>
      </div>

      {/* SS Optimization */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-medium mb-1">Social Security Optimization</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Compare claiming strategies based on your estimated monthly benefit of{" "}
          {formatCurrency(ssMonthlyBenefit)} at full retirement age (67).
        </p>
        <SSComparisonTable benefits={result.ssBenefits} />
      </div>

      {/* Withdrawal Order */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
        <h2 className="text-lg font-medium mb-1">Tax-Efficient Withdrawal Order</h2>
        <p className="text-xs text-zinc-400 mb-4">
          Recommended sequence for drawing down your retirement accounts to minimize
          lifetime taxes.
        </p>
        <div className="space-y-3">
          {result.withdrawalOrder.map((rec) => (
            <div
              key={rec.accountType}
              className="flex items-start gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/50"
            >
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm font-semibold text-emerald-400">
                {rec.order}
              </span>
              <div>
                <div className="text-sm font-medium text-zinc-200">
                  {formatAccountType(rec.accountType)}
                </div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  {rec.rationale}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Income Projection Chart */}
      {result.projection.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
          <h2 className="text-lg font-medium mb-1">Income Projection</h2>
          <p className="text-xs text-zinc-400 mb-4">
            Annual retirement income by source from age {retirementAge} to 95.
          </p>
          <WithdrawalChart projection={result.projection} height={350} />
        </div>
      )}

      {/* Detailed Projection Table (collapsible) */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between p-5 text-left"
        >
          <div>
            <h2 className="text-lg font-medium">Detailed Year-by-Year Projection</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Complete breakdown of income, taxes, and net income for each year
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-zinc-400 transition-transform ${
              detailsOpen ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </button>
        {detailsOpen && (
          <div className="px-5 pb-5">
            <IncomeProjectionTable projection={result.projection} />
          </div>
        )}
      </div>

      {/* Methodology Note */}
      <div className="text-xs text-zinc-600 pb-4">
        Social Security estimates use simplified early/delayed claiming adjustments
        based on FRA of 67 (birth year 1960+). Tax estimates are approximate
        (~15% on traditional withdrawals, ~15% on SS income). RMDs begin at age 73
        using simplified Uniform Lifetime Table factors. This is for educational
        purposes only and does not constitute financial advice.
      </div>
    </div>
  );
}

/** Pretty-print account type strings for display */
function formatAccountType(type: string): string {
  const map: Record<string, string> = {
    BROKERAGE: "Taxable Brokerage",
    TAXABLE: "Taxable Account",
    "401K": "Traditional 401(k)",
    TRADITIONAL_IRA: "Traditional IRA",
    IRA: "Traditional IRA",
    ROTH: "Roth Account",
    ROTH_IRA: "Roth IRA",
    ROTH_401K: "Roth 401(k)",
  };
  return map[type.toUpperCase()] ?? type;
}
