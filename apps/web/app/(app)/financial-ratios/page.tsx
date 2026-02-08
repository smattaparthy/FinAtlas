"use client";

import { useEffect, useMemo, useState } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatPercent } from "@/lib/format";
import {
  calculateRatios,
  type RatioInput,
  type RatioResult,
} from "@/lib/ratios/ratioCalculations";

interface DashboardData {
  totalAnnualIncome: number;
  totalAnnualExpenses: number;
  netWorth: number;
}

interface LoanData {
  monthlyPayment: number;
  currentBalance: number;
  type: string;
}

interface AccountData {
  balance: number;
  type: string;
}

export default function FinancialRatiosPage() {
  const { selectedScenarioId } = useScenario();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedScenarioId) return;

    setLoading(true);
    Promise.all([
      fetch(`/api/dashboard?scenarioId=${selectedScenarioId}`).then((r) =>
        r.json()
      ),
      fetch(`/api/loans?scenarioId=${selectedScenarioId}`).then((r) =>
        r.json()
      ),
      fetch(`/api/accounts?scenarioId=${selectedScenarioId}`).then((r) =>
        r.json()
      ),
    ])
      .then(([dashboard, loansData, accountsData]) => {
        setDashboardData(dashboard);
        setLoans(loansData);
        setAccounts(accountsData);
      })
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  const ratioResults: RatioResult | null = useMemo(() => {
    if (!dashboardData) return null;

    const monthlyGrossIncome = dashboardData.totalAnnualIncome / 12;
    const monthlyExpenses = dashboardData.totalAnnualExpenses / 12;

    const totalMonthlyDebt = loans.reduce(
      (sum, loan) => sum + (loan.monthlyPayment || 0),
      0
    );

    const housingExpenses = loans
      .filter(
        (loan) =>
          loan.type === "MORTGAGE" || loan.type === "HELOC"
      )
      .reduce((sum, loan) => sum + (loan.monthlyPayment || 0), 0);

    const liquidAssets = accounts
      .filter((acc) => acc.type === "SAVINGS" || acc.type === "BROKERAGE")
      .reduce((sum, acc) => sum + acc.balance, 0);

    const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);

    const totalLiabilities = loans.reduce(
      (sum, loan) => sum + (loan.currentBalance || 0),
      0
    );

    const input: RatioInput = {
      monthlyGrossIncome,
      monthlyExpenses,
      totalMonthlyDebt,
      housingExpenses,
      liquidAssets,
      totalAssets,
      totalLiabilities,
      annualIncome: dashboardData.totalAnnualIncome,
      netWorth: dashboardData.netWorth,
    };

    return calculateRatios(input);
  }, [dashboardData, loans, accounts]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!ratioResults || !dashboardData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-50">
            No Data Available
          </h2>
          <p className="text-zinc-400">
            Add income, expenses, and accounts to calculate financial ratios
          </p>
        </div>
      </div>
    );
  }

  const hasMinimalData =
    dashboardData.totalAnnualIncome === 0 &&
    dashboardData.totalAnnualExpenses === 0 &&
    accounts.length === 0;

  if (hasMinimalData) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-zinc-50">
            No Data Available
          </h2>
          <p className="text-zinc-400">
            Add income, expenses, and accounts to calculate financial ratios
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-zinc-50">Financial Ratios</h1>
        <p className="mt-2 text-zinc-400">
          Track key financial health indicators and benchmarks
        </p>
      </div>

      {/* Overall Health Score */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-8">
        <div className="flex flex-col items-center justify-center space-y-4 md:flex-row md:space-x-8 md:space-y-0">
          <div className="flex flex-col items-center">
            <div
              className={`relative flex h-32 w-32 items-center justify-center rounded-full border-8 ${
                ratioResults.overallRating === "good"
                  ? "border-emerald-500"
                  : ratioResults.overallRating === "fair"
                    ? "border-amber-500"
                    : "border-red-500"
              }`}
            >
              <span className="text-4xl font-bold text-zinc-50">
                {Math.round(ratioResults.overallScore)}
              </span>
            </div>
          </div>
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-zinc-50">
              Overall Financial Health
            </h2>
            <div className="mt-2 flex items-center justify-center md:justify-start">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                  ratioResults.overallRating === "good"
                    ? "bg-emerald-500 text-zinc-950"
                    : ratioResults.overallRating === "fair"
                      ? "bg-amber-500 text-zinc-950"
                      : "bg-red-500 text-zinc-50"
                }`}
              >
                {ratioResults.overallRating.toUpperCase()}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Score out of 100 based on five key financial ratios
            </p>
          </div>
        </div>
      </div>

      {/* Ratio Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RatioCard
          name="Debt-to-Income"
          detail={ratioResults.debtToIncome}
          formatValue={(v) => formatPercent(v)}
          progressValue={ratioResults.debtToIncome.value}
          progressMax={0.5}
        />
        <RatioCard
          name="Savings Rate"
          detail={ratioResults.savingsRate}
          formatValue={(v) => formatPercent(v)}
          progressValue={ratioResults.savingsRate.value}
          progressMax={0.3}
        />
        <RatioCard
          name="Liquidity Ratio"
          detail={ratioResults.liquidityRatio}
          formatValue={(v) => `${v.toFixed(1)} months`}
          progressValue={ratioResults.liquidityRatio.value}
          progressMax={12}
        />
        <RatioCard
          name="Housing Ratio"
          detail={ratioResults.housingRatio}
          formatValue={(v) => formatPercent(v)}
          progressValue={ratioResults.housingRatio.value}
          progressMax={0.5}
        />
        <RatioCard
          name="Net Worth to Income"
          detail={ratioResults.netWorthToIncome}
          formatValue={(v) => `${v.toFixed(1)}x`}
          progressValue={ratioResults.netWorthToIncome.value}
          progressMax={4}
        />
      </div>

      {/* Info Section */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h3 className="mb-4 text-xl font-bold text-zinc-50">
          Understanding Your Ratios
        </h3>
        <div className="space-y-3 text-sm text-zinc-400">
          <p>
            <strong className="text-zinc-300">Debt-to-Income:</strong> Measures
            how much of your monthly income goes toward debt payments. Lenders
            typically prefer this to be under 36%.
          </p>
          <p>
            <strong className="text-zinc-300">Savings Rate:</strong> Shows what
            percentage of your income you're saving. Financial experts recommend
            saving at least 20% of your income.
          </p>
          <p>
            <strong className="text-zinc-300">Liquidity Ratio:</strong>{" "}
            Indicates how many months of expenses you can cover with liquid
            assets. A 6-month emergency fund is recommended.
          </p>
          <p>
            <strong className="text-zinc-300">Housing Ratio:</strong> The
            portion of your income spent on housing. Keeping this under 28%
            helps maintain financial flexibility.
          </p>
          <p>
            <strong className="text-zinc-300">Net Worth to Income:</strong> Your
            net worth relative to annual income. A ratio of 2x or higher
            suggests strong wealth accumulation.
          </p>
        </div>
      </div>
    </div>
  );
}

interface RatioCardProps {
  name: string;
  detail: {
    value: number;
    rating: "good" | "fair" | "poor";
    benchmark: string;
    description: string;
  };
  formatValue: (value: number) => string;
  progressValue: number;
  progressMax: number;
}

function RatioCard({
  name,
  detail,
  formatValue,
  progressValue,
  progressMax,
}: RatioCardProps) {
  const colorClass =
    detail.rating === "good"
      ? "text-emerald-400"
      : detail.rating === "fair"
        ? "text-amber-400"
        : "text-red-400";

  const bgColorClass =
    detail.rating === "good"
      ? "bg-emerald-500"
      : detail.rating === "fair"
        ? "bg-amber-500"
        : "bg-red-500";

  const progress = Math.min((progressValue / progressMax) * 100, 100);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="font-bold text-zinc-50">{name}</h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${bgColorClass} text-zinc-950`}
        >
          {detail.rating.toUpperCase()}
        </span>
      </div>

      <div className={`mb-3 text-3xl font-bold ${colorClass}`}>
        {formatValue(detail.value)}
      </div>

      <div className="mb-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full ${bgColorClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-zinc-500">
          Target: {detail.benchmark}
        </p>
      </div>

      <p className="text-sm text-zinc-400">{detail.description}</p>
    </div>
  );
}
