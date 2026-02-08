"use client";

import { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import DebtPayoffChart from "@/components/charts/DebtPayoffChart";
import { formatCurrency } from "@/lib/format";
import {
  compareStrategies,
  type LoanForPayoff,
  type PayoffComparison,
} from "@/lib/debt/payoffStrategies";

export default function DebtPayoffPage() {
  const { selectedScenarioId } = useScenario();
  const [loans, setLoans] = useState<LoanForPayoff[]>([]);
  const [loading, setLoading] = useState(true);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [activeTab, setActiveTab] = useState<"avalanche" | "snowball">("avalanche");

  useEffect(() => {
    if (!selectedScenarioId) return;
    setLoading(true);
    fetch(`/api/loans?scenarioId=${selectedScenarioId}`)
      .then((res) => (res.ok ? res.json() : { loans: [] }))
      .then((data) => {
        const mapped: LoanForPayoff[] = (data.loans || []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          name: l.name as string,
          type: l.type as string,
          currentBalance: l.currentBalance as number,
          interestRate: l.interestRate as number,
          monthlyPayment: l.monthlyPayment as number,
        }));
        setLoans(mapped.filter((l) => l.currentBalance > 0));
      })
      .catch(() => setLoans([]))
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  const comparison: PayoffComparison | null = useMemo(() => {
    if (loans.length === 0) return null;
    return compareStrategies(loans, extraMonthly);
  }, [loans, extraMonthly]);

  if (!selectedScenarioId) return <PageSkeleton />;

  if (loading) return <PageSkeleton />;

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Debt Payoff Strategies</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Compare avalanche vs snowball strategies to optimize your debt payoff
          </p>
        </div>
        <EmptyState
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
            </svg>
          }
          title="No Active Loans"
          description="Add loans to your scenario to compare debt payoff strategies."
          actionLabel="Add Loan"
          actionHref="/loans/new"
        />
      </div>
    );
  }

  const activeResult = activeTab === "avalanche" ? comparison!.avalanche : comparison!.snowball;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Debt Payoff Strategies</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Compare avalanche vs snowball strategies to optimize your debt payoff
        </p>
      </div>

      {/* Extra Payment Input */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">Extra Monthly Payment</h2>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
            <input
              type="number"
              min="0"
              step="50"
              value={extraMonthly || ""}
              onChange={(e) => setExtraMonthly(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0"
              className="w-40 bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <p className="text-xs text-zinc-500">
            Additional amount applied to the target loan each month beyond minimum payments
          </p>
        </div>
      </div>

      {/* Comparison Summary */}
      {comparison && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Avalanche */}
          <div className={`rounded-2xl border p-5 ${activeTab === "avalanche" ? "border-emerald-500/40 bg-emerald-500/5" : "border-zinc-800 bg-zinc-950/60"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-emerald-400">Avalanche</h3>
              <span className="text-xs text-zinc-500">Highest rate first</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-zinc-500">Time to debt-free</div>
                <div className="text-lg font-semibold">
                  {Math.floor(comparison.avalanche.totalMonths / 12)}y {comparison.avalanche.totalMonths % 12}m
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total interest</div>
                <div className="text-lg font-semibold">{formatCurrency(comparison.avalanche.totalInterestPaid)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total paid</div>
                <div className="text-sm text-zinc-400">{formatCurrency(comparison.avalanche.totalPaid)}</div>
              </div>
            </div>
          </div>

          {/* Snowball */}
          <div className={`rounded-2xl border p-5 ${activeTab === "snowball" ? "border-amber-500/40 bg-amber-500/5" : "border-zinc-800 bg-zinc-950/60"}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-amber-400">Snowball</h3>
              <span className="text-xs text-zinc-500">Lowest balance first</span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-zinc-500">Time to debt-free</div>
                <div className="text-lg font-semibold">
                  {Math.floor(comparison.snowball.totalMonths / 12)}y {comparison.snowball.totalMonths % 12}m
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total interest</div>
                <div className="text-lg font-semibold">{formatCurrency(comparison.snowball.totalInterestPaid)}</div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Total paid</div>
                <div className="text-sm text-zinc-400">{formatCurrency(comparison.snowball.totalPaid)}</div>
              </div>
            </div>
          </div>

          {/* Savings */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <div className="mb-3">
              <h3 className="text-sm font-medium text-zinc-300">Avalanche Saves</h3>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-xs text-zinc-500">Interest saved</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {comparison.interestSavings > 0 ? formatCurrency(comparison.interestSavings) : "$0"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Time saved</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {comparison.timeDifference > 0 ? `${comparison.timeDifference} months` : "0 months"}
                </div>
              </div>
              <div className="text-xs text-zinc-500 mt-2">
                {comparison.interestSavings > 0
                  ? "Avalanche is mathematically optimal"
                  : "Both strategies yield similar results"}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {comparison && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
          <h2 className="text-lg font-medium mb-4">Total Debt Balance Over Time</h2>
          <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-emerald-500" />
              <span>Avalanche</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-0.5 bg-amber-500" />
              <span>Snowball</span>
            </div>
          </div>
          <DebtPayoffChart
            avalanche={comparison.avalanche.schedule}
            snowball={comparison.snowball.schedule}
            height={300}
          />
        </div>
      )}

      {/* Strategy Tab Toggle & Payoff Order */}
      {comparison && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
          <div className="flex border-b border-zinc-800">
            <button
              onClick={() => setActiveTab("avalanche")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "avalanche"
                  ? "bg-zinc-800/50 text-emerald-400 border-b-2 border-emerald-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Avalanche Order
            </button>
            <button
              onClick={() => setActiveTab("snowball")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === "snowball"
                  ? "bg-zinc-800/50 text-amber-400 border-b-2 border-amber-400"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Snowball Order
            </button>
          </div>

          <div className="p-6">
            {/* Payoff Order */}
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Payoff Order</h3>
            <div className="space-y-2 mb-6">
              {activeResult.payoffOrder.map((loanId, idx) => {
                const loan = loans.find((l) => l.id === loanId)!;
                const info = activeResult.perLoan[loanId];
                return (
                  <div key={loanId} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/50">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      activeTab === "avalanche" ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-zinc-200 truncate">{loan.name}</div>
                      <div className="text-xs text-zinc-500">
                        {loan.interestRate}% APR &middot; {formatCurrency(loan.currentBalance)} balance
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {Math.floor(info.payoffMonth / 12)}y {info.payoffMonth % 12}m
                      </div>
                      <div className="text-xs text-zinc-500">
                        {formatCurrency(info.totalInterest)} interest
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Loan Breakdown Table */}
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Loan Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                    <th className="text-left p-3">Loan</th>
                    <th className="text-right p-3">Balance</th>
                    <th className="text-right p-3">Rate</th>
                    <th className="text-right p-3">Min Payment</th>
                    <th className="text-right p-3">Payoff Time</th>
                    <th className="text-right p-3">Total Interest</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map((loan) => {
                    const info = activeResult.perLoan[loan.id];
                    return (
                      <tr key={loan.id} className="border-b border-zinc-800/50">
                        <td className="p-3 text-zinc-200">{loan.name}</td>
                        <td className="p-3 text-right text-zinc-300">{formatCurrency(loan.currentBalance)}</td>
                        <td className="p-3 text-right text-zinc-300">{loan.interestRate}%</td>
                        <td className="p-3 text-right text-zinc-300">{formatCurrency(loan.monthlyPayment)}</td>
                        <td className="p-3 text-right">
                          {info ? `${Math.floor(info.payoffMonth / 12)}y ${info.payoffMonth % 12}m` : "N/A"}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {info ? formatCurrency(info.totalInterest) : "N/A"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Methodology Note */}
      <div className="text-xs text-zinc-600 pb-4">
        Calculations assume fixed interest rates and minimum payments. Avalanche strategy targets the
        highest interest rate loan first, while snowball targets the lowest balance. Extra payments are
        cascaded to the next loan when one is paid off.
      </div>
    </div>
  );
}
