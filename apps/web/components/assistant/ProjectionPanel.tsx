"use client";

import { useChat } from "@/contexts/ChatContext";
import { useEffect, useState } from "react";
import NetWorthChart from "@/components/charts/NetWorthChart";
import type { SeriesPoint } from "@finatlas/engine/src/types";

export default function ProjectionPanel() {
  const { state, undoLastModification, resetConversation } = useChat();
  const [baselineProjection, setBaselineProjection] = useState<SeriesPoint[]>([]);
  const [modifiedProjection, setModifiedProjection] = useState<SeriesPoint[]>([]);

  useEffect(() => {
    async function calculateProjections() {
      if (!state.baselineData || !state.modifiedData) return;

      // Simple projection calculation (can be enhanced with engine later)
      const baseline = calculateSimpleProjection(state.baselineData);
      const modified = calculateSimpleProjection(state.modifiedData);

      setBaselineProjection(baseline);
      setModifiedProjection(modified);
    }

    calculateProjections();
  }, [state.baselineData, state.modifiedData, state.modifications]);

  function calculateSimpleProjection(data: any): SeriesPoint[] {
    const currentDate = new Date();
    const projectionYears = 10;

    // Calculate initial net worth
    const initialNetWorth = data.accounts.reduce(
      (sum: number, acc: any) => sum + acc.balance,
      0
    );

    // Calculate annual income and expenses
    const frequencyMultipliers: Record<string, number> = {
      ANNUAL: 1,
      MONTHLY: 12,
      BIWEEKLY: 26,
      WEEKLY: 52,
      ONE_TIME: 0,
    };

    const annualIncome = data.incomes.reduce(
      (sum: number, inc: any) =>
        sum + inc.amount * (frequencyMultipliers[inc.frequency] ?? 1),
      0
    );

    const annualExpenses = data.expenses.reduce(
      (sum: number, exp: any) =>
        sum + exp.amount * (frequencyMultipliers[exp.frequency] ?? 1),
      0
    );

    // Calculate loan payments
    const annualLoanPayments = data.loans.reduce((sum: number, loan: any) => {
      const monthlyRate = loan.interestRate / 12;
      const numPayments = loan.termYears * 12;
      const monthlyPayment =
        (loan.principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      return sum + monthlyPayment * 12;
    }, 0);

    const annualSavings = annualIncome - annualExpenses - annualLoanPayments;
    const estimatedTaxRate = 0.25;
    const netAnnualSavings = annualSavings * (1 - estimatedTaxRate);
    const growthRate = 0.06;

    // Generate projection
    const projection: SeriesPoint[] = [];
    let netWorth = initialNetWorth;

    for (let i = 0; i <= projectionYears; i++) {
      const projectionDate = new Date(currentDate);
      projectionDate.setFullYear(currentDate.getFullYear() + i);

      projection.push({
        t: projectionDate.toISOString(),
        v: Math.round(netWorth),
      });

      netWorth = netWorth * (1 + growthRate) + netAnnualSavings;
    }

    return projection;
  }

  const baselineEndValue = baselineProjection[baselineProjection.length - 1]?.v ?? 0;
  const modifiedEndValue = modifiedProjection[modifiedProjection.length - 1]?.v ?? 0;
  const delta = modifiedEndValue - baselineEndValue;
  const deltaPercent = baselineEndValue > 0 ? (delta / baselineEndValue) * 100 : 0;

  function formatCurrency(amount: number): string {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toFixed(0)}`;
  }

  return (
    <div className="space-y-4">
      {/* Projection Chart */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Net Worth Projection</h2>

        {state.modifications.length > 0 ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6 text-center">
              <div>
                <div className="text-xs text-zinc-500">Baseline</div>
                <div className="text-lg font-semibold text-zinc-300">
                  {formatCurrency(baselineEndValue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Modified</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {formatCurrency(modifiedEndValue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-500">Difference</div>
                <div
                  className={`text-lg font-semibold ${
                    delta >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {delta >= 0 ? "+" : ""}
                  {formatCurrency(delta)}
                </div>
                <div className="text-xs text-zinc-500">
                  ({deltaPercent >= 0 ? "+" : ""}
                  {deltaPercent.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* Comparison Chart */}
            <div className="relative">
              <NetWorthChart series={modifiedProjection} height={200} />
              <div className="absolute top-0 right-0 text-xs text-zinc-500">
                Green = Modified | Gray = Baseline
              </div>
            </div>
          </>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-zinc-500">
            Apply modifications to see projection changes
          </div>
        )}
      </div>

      {/* Modification History */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h2 className="text-lg font-medium mb-4">Modifications ({state.modifications.length})</h2>

        {state.modifications.length > 0 ? (
          <>
            <div className="space-y-2 mb-4">
              {state.modifications.map((mod, index) => (
                <div
                  key={mod.id}
                  className="flex items-start justify-between p-3 rounded-lg bg-zinc-800/50"
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-200">{mod.description}</div>
                    <div className="text-xs text-zinc-500 mt-1">{mod.type}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={undoLastModification}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm"
              >
                Undo Last
              </button>
              <button
                onClick={resetConversation}
                className="flex-1 px-4 py-2 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-sm"
              >
                Reset All
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-zinc-500 py-8">
            No modifications yet
          </div>
        )}
      </div>
    </div>
  );
}
