"use client";

import { formatCurrency } from "@/lib/format";
import type { HealthcareResult } from "@/lib/healthcare/healthcareCostCalculations";

interface HealthcareSummaryCardsProps {
  result: HealthcareResult;
}

export default function HealthcareSummaryCards({ result }: HealthcareSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Lifetime Cost */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="text-xs text-zinc-500 mb-1">Total Lifetime Cost</div>
        <div className="text-xl font-semibold">{formatCurrency(result.totalLifetimeCost)}</div>
        <div className="text-xs text-zinc-600 mt-1">After HSA contributions</div>
      </div>

      {/* Monthly Budget Needed */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="text-xs text-zinc-500 mb-1">Avg Monthly in Retirement</div>
        <div className="text-xl font-semibold text-emerald-400">
          {formatCurrency(result.monthlyBudgetNeeded)}
        </div>
        <div className="text-xs text-zinc-600 mt-1">Average monthly healthcare budget</div>
      </div>

      {/* HSA Coverage Years */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="text-xs text-zinc-500 mb-1">HSA Coverage Years</div>
        <div className="text-xl font-semibold text-purple-400">
          {result.hsaCoverageYears} years
        </div>
        <div className="text-xs text-zinc-600 mt-1">
          Final balance: {formatCurrency(result.hsaProjectedBalance)}
        </div>
      </div>

      {/* Early Retirement Gap */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
        <div className="text-xs text-zinc-500 mb-1">Early Retirement Cost</div>
        <div className="text-xl font-semibold text-amber-400">
          {formatCurrency(result.earlyRetirementCost)}
        </div>
        <div className="text-xs text-zinc-600 mt-1">Pre-Medicare coverage gap</div>
      </div>
    </div>
  );
}
