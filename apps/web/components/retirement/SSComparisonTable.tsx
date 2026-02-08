"use client";

import { formatCurrency } from "@/lib/format";
import type { SSBenefitEstimate } from "@/lib/retirement/retirementIncomeCalculations";

interface SSComparisonTableProps {
  benefits: SSBenefitEstimate[];
}

export default function SSComparisonTable({
  benefits,
}: SSComparisonTableProps) {
  // Find the optimal row: highest cumulative by age 85
  const optimalIdx = benefits.reduce(
    (bestIdx, b, idx, arr) =>
      b.cumulativeBy85 > arr[bestIdx].cumulativeBy85 ? idx : bestIdx,
    0
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-400 text-xs">
            <th className="text-left py-2 pr-4 font-medium">Claim Age</th>
            <th className="text-right py-2 px-4 font-medium">Monthly</th>
            <th className="text-right py-2 px-4 font-medium">Annual</th>
            <th className="text-right py-2 px-4 font-medium">
              Cumulative by 80
            </th>
            <th className="text-right py-2 px-4 font-medium">
              Cumulative by 85
            </th>
            <th className="text-right py-2 px-4 font-medium">
              Cumulative by 90
            </th>
          </tr>
        </thead>
        <tbody>
          {benefits.map((b, idx) => {
            const isOptimal = idx === optimalIdx;
            return (
              <tr
                key={b.claimAge}
                className={`border-b border-zinc-800/50 ${
                  isOptimal
                    ? "bg-emerald-500/10"
                    : "hover:bg-zinc-800/30"
                }`}
              >
                <td className="py-3 pr-4 font-medium">
                  <span className="flex items-center gap-2">
                    {b.claimAge}
                    {isOptimal && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded">
                        Optimal
                      </span>
                    )}
                  </span>
                </td>
                <td className="text-right py-3 px-4 text-zinc-200">
                  {formatCurrency(b.monthlyBenefit)}
                </td>
                <td className="text-right py-3 px-4 text-zinc-200">
                  {formatCurrency(b.annualBenefit)}
                </td>
                <td className="text-right py-3 px-4 text-zinc-300">
                  {formatCurrency(b.cumulativeBy80)}
                </td>
                <td
                  className={`text-right py-3 px-4 ${
                    isOptimal
                      ? "text-emerald-400 font-semibold"
                      : "text-zinc-300"
                  }`}
                >
                  {formatCurrency(b.cumulativeBy85)}
                </td>
                <td className="text-right py-3 px-4 text-zinc-300">
                  {formatCurrency(b.cumulativeBy90)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
