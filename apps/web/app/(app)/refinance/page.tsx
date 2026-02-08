"use client";

import { useEffect, useState, useMemo } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import { PageSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import RefinanceComparisonChart from "@/components/charts/RefinanceComparisonChart";
import {
  calculateRefinance,
  type CurrentLoanTerms,
  type NewLoanTerms,
  type RefinanceComparison,
} from "@/lib/refinance/refinanceCalculations";
import { formatCurrency } from "@/lib/format";

interface Loan {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentBalance: number;
  interestRate: number;
  monthlyPayment: number;
  startDate: string;
  termMonths: number;
}

export default function RefinancePage() {
  const { selectedScenarioId } = useScenario();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null);
  const [newRate, setNewRate] = useState(5);
  const [newTermMonths, setNewTermMonths] = useState(360);
  const [closingCosts, setClosingCosts] = useState(3000);
  const [points, setPoints] = useState(0);

  // Fetch loans
  useEffect(() => {
    if (!selectedScenarioId) return;
    setLoading(true);
    fetch(`/api/loans?scenarioId=${selectedScenarioId}`)
      .then((res) => (res.ok ? res.json() : { loans: [] }))
      .then((data) => {
        const mapped: Loan[] = (data.loans || []).map(
          (l: Record<string, unknown>) => ({
            id: l.id as string,
            name: l.name as string,
            type: l.type as string,
            principal: l.principal as number,
            currentBalance: l.currentBalance as number,
            interestRate: l.interestRate as number,
            monthlyPayment: l.monthlyPayment as number,
            startDate: l.startDate as string,
            termMonths: l.termMonths as number,
          })
        );
        setLoans(mapped.filter((l) => l.currentBalance > 0));
      })
      .catch(() => setLoans([]))
      .finally(() => setLoading(false));
  }, [selectedScenarioId]);

  const selectedLoan = loans.find((l) => l.id === selectedLoanId) ?? null;

  // Auto-populate new rate when loan selection changes
  useEffect(() => {
    if (selectedLoan) {
      setNewRate(Math.max(0.1, selectedLoan.interestRate - 1));
    }
  }, [selectedLoan]);

  // Compute remaining months for the selected loan
  const elapsedMonths = selectedLoan
    ? Math.max(
        0,
        Math.floor(
          (Date.now() - new Date(selectedLoan.startDate).getTime()) /
            (30.44 * 24 * 60 * 60 * 1000)
        )
      )
    : 0;
  const remainingMonths = selectedLoan
    ? Math.max(1, selectedLoan.termMonths - elapsedMonths)
    : 0;

  // Calculate refinance comparison
  const comparison: RefinanceComparison | null = useMemo(() => {
    if (!selectedLoan) return null;

    const currentTerms: CurrentLoanTerms = {
      name: selectedLoan.name,
      currentBalance: selectedLoan.currentBalance,
      interestRate: selectedLoan.interestRate,
      monthlyPayment: selectedLoan.monthlyPayment,
      remainingMonths,
    };

    const newTerms: NewLoanTerms = {
      interestRate: newRate,
      termMonths: newTermMonths,
      closingCosts,
      points,
    };

    return calculateRefinance(currentTerms, newTerms);
  }, [selectedLoan, remainingMonths, newRate, newTermMonths, closingCosts, points]);

  // Format break-even for display
  function formatBreakEven(months: number): string {
    if (!isFinite(months)) return "No savings";
    if (months < 12) return `${months} months`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} years ${rem} months` : `${years} years`;
  }

  // Format payoff time
  function formatPayoffTime(months: number): string {
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (years === 0) return `${rem}m`;
    return rem > 0 ? `${years}y ${rem}m` : `${years}y`;
  }

  if (!selectedScenarioId) return <PageSkeleton />;
  if (loading) return <PageSkeleton />;

  if (loans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Refinance Calculator</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Compare your current loan terms with refinancing options
          </p>
        </div>
        <EmptyState
          icon={
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z"
              />
            </svg>
          }
          title="No Loans"
          description="Add loans to your scenario to use the refinance calculator."
          actionLabel="Add Loan"
          actionHref="/loans/new"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Refinance Calculator</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Compare your current loan terms with refinancing options
        </p>
      </div>

      {/* Loan Selector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
        <h2 className="text-sm font-medium text-zinc-300 mb-4">
          Select Loan
        </h2>
        <select
          value={selectedLoanId ?? ""}
          onChange={(e) =>
            setSelectedLoanId(e.target.value || null)
          }
          className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
        >
          <option value="">Select a loan to refinance...</option>
          {loans.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} - {formatCurrency(l.currentBalance)} @ {l.interestRate}%
            </option>
          ))}
        </select>
      </div>

      {selectedLoan && (
        <>
          {/* Current Terms (read-only) */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              Current Loan Terms
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-zinc-500">Balance</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(selectedLoan.currentBalance)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Interest Rate</div>
                <div className="text-lg font-semibold">
                  {selectedLoan.interestRate}%
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Monthly Payment</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(selectedLoan.monthlyPayment)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Remaining Term</div>
                <div className="text-lg font-semibold">
                  {formatPayoffTime(remainingMonths)}
                </div>
              </div>
            </div>
          </div>

          {/* New Terms Input */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
            <h2 className="text-sm font-medium text-zinc-300 mb-4">
              New Loan Terms
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* New Interest Rate */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  New Interest Rate
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0.1"
                    max="30"
                    step="0.125"
                    value={newRate}
                    onChange={(e) =>
                      setNewRate(
                        Math.max(0.1, parseFloat(e.target.value) || 0.1)
                      )
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 pr-7 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    %
                  </span>
                </div>
              </div>

              {/* New Term */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  New Term
                </label>
                <select
                  value={newTermMonths}
                  onChange={(e) =>
                    setNewTermMonths(parseInt(e.target.value, 10))
                  }
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                >
                  <option value={120}>10 years</option>
                  <option value={180}>15 years</option>
                  <option value={240}>20 years</option>
                  <option value={300}>25 years</option>
                  <option value={360}>30 years</option>
                </select>
              </div>

              {/* Closing Costs */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Closing Costs
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={closingCosts || ""}
                    onChange={(e) =>
                      setClosingCosts(
                        Math.max(0, parseFloat(e.target.value) || 0)
                      )
                    }
                    placeholder="0"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl pl-7 pr-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Points */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1">
                  Points
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="3"
                    step="0.25"
                    value={points}
                    onChange={(e) =>
                      setPoints(
                        Math.min(
                          3,
                          Math.max(0, parseFloat(e.target.value) || 0)
                        )
                      )
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 pr-7 py-2 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Cards */}
          {comparison && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Monthly Savings */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="text-xs text-zinc-500 mb-1">
                  Monthly Savings
                </div>
                <div
                  className={`text-2xl font-semibold ${
                    comparison.monthlySavings > 0
                      ? "text-emerald-400"
                      : comparison.monthlySavings < 0
                        ? "text-red-400"
                        : "text-zinc-200"
                  }`}
                >
                  {formatCurrency(Math.abs(comparison.monthlySavings))}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {comparison.monthlySavings > 0
                    ? "less per month"
                    : comparison.monthlySavings < 0
                      ? "more per month"
                      : "same payment"}
                </div>
              </div>

              {/* Total Interest Saved */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="text-xs text-zinc-500 mb-1">
                  Total Interest Saved
                </div>
                <div
                  className={`text-2xl font-semibold ${
                    comparison.totalInterestSaved > 0
                      ? "text-emerald-400"
                      : comparison.totalInterestSaved < 0
                        ? "text-red-400"
                        : "text-zinc-200"
                  }`}
                >
                  {formatCurrency(Math.abs(comparison.totalInterestSaved))}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {comparison.totalInterestSaved > 0
                    ? "saved in interest"
                    : comparison.totalInterestSaved < 0
                      ? "additional interest"
                      : "same interest"}
                </div>
              </div>

              {/* Break-Even */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5">
                <div className="text-xs text-zinc-500 mb-1">Break-Even</div>
                <div className="text-2xl font-semibold">
                  {formatBreakEven(comparison.breakEvenMonths)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">
                  {isFinite(comparison.breakEvenMonths)
                    ? "to recoup closing costs"
                    : "closing costs exceed savings"}
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          {comparison && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-6">
              <h2 className="text-lg font-medium mb-4">
                Remaining Balance Over Time
              </h2>
              <div className="mb-3 flex items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 bg-amber-500" />
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-6 h-0.5 bg-emerald-500" />
                  <span>Refinanced</span>
                </div>
              </div>
              <RefinanceComparisonChart
                currentSchedule={comparison.current.schedule}
                refinancedSchedule={comparison.refinanced.schedule}
                height={300}
              />
            </div>
          )}

          {/* Comparison Table */}
          {comparison && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-medium mb-4">
                  Side-by-Side Comparison
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs text-zinc-400 uppercase tracking-wide">
                        <th className="text-left p-3">Metric</th>
                        <th className="text-right p-3">Current</th>
                        <th className="text-right p-3">Refinanced</th>
                        <th className="text-right p-3">Difference</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-800/50">
                        <td className="p-3 text-zinc-200">Monthly Payment</td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(comparison.current.monthlyPayment)}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(comparison.refinanced.monthlyPayment)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            comparison.monthlySavings > 0
                              ? "text-emerald-400"
                              : comparison.monthlySavings < 0
                                ? "text-red-400"
                                : "text-zinc-300"
                          }`}
                        >
                          {comparison.monthlySavings > 0 ? "-" : comparison.monthlySavings < 0 ? "+" : ""}
                          {formatCurrency(Math.abs(comparison.monthlySavings))}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-800/50">
                        <td className="p-3 text-zinc-200">Total Interest</td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(comparison.current.totalInterest)}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(comparison.refinanced.totalInterest)}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            comparison.totalInterestSaved > 0
                              ? "text-emerald-400"
                              : comparison.totalInterestSaved < 0
                                ? "text-red-400"
                                : "text-zinc-300"
                          }`}
                        >
                          {comparison.totalInterestSaved > 0 ? "-" : comparison.totalInterestSaved < 0 ? "+" : ""}
                          {formatCurrency(
                            Math.abs(comparison.totalInterestSaved)
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-800/50">
                        <td className="p-3 text-zinc-200">
                          Total Cost
                          <span className="text-xs text-zinc-500 ml-1">
                            (incl. closing costs)
                          </span>
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(comparison.current.totalCost)}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatCurrency(
                            comparison.refinanced.totalCost +
                              comparison.closingCostTotal
                          )}
                        </td>
                        <td
                          className={`p-3 text-right font-medium ${
                            comparison.totalCostDifference > 0
                              ? "text-emerald-400"
                              : comparison.totalCostDifference < 0
                                ? "text-red-400"
                                : "text-zinc-300"
                          }`}
                        >
                          {comparison.totalCostDifference > 0 ? "-" : comparison.totalCostDifference < 0 ? "+" : ""}
                          {formatCurrency(
                            Math.abs(comparison.totalCostDifference)
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-800/50">
                        <td className="p-3 text-zinc-200">Payoff Time</td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatPayoffTime(comparison.current.payoffMonths)}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {formatPayoffTime(comparison.refinanced.payoffMonths)}
                        </td>
                        <td className="p-3 text-right text-zinc-300">
                          {comparison.current.payoffMonths -
                            comparison.refinanced.payoffMonths >
                          0
                            ? `-${formatPayoffTime(comparison.current.payoffMonths - comparison.refinanced.payoffMonths)}`
                            : comparison.current.payoffMonths -
                                  comparison.refinanced.payoffMonths <
                                0
                              ? `+${formatPayoffTime(comparison.refinanced.payoffMonths - comparison.current.payoffMonths)}`
                              : "Same"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Methodology Note */}
          <div className="text-xs text-zinc-600 pb-4">
            Break-even is when cumulative monthly savings exceed closing costs
            and points. Total cost for the refinanced loan includes closing
            costs. Calculations assume fixed interest rates and do not account
            for tax implications or changes in property value.
          </div>
        </>
      )}
    </div>
  );
}
