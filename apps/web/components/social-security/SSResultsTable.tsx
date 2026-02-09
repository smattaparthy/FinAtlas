"use client";

import { type SSClaimingScenario } from "@/lib/social-security/ssOptimization";
import { formatCurrency } from "@/lib/format";

interface SSResultsTableProps {
  scenarios: SSClaimingScenario[];
  optimalClaimAge: number;
}

export default function SSResultsTable({
  scenarios,
  optimalClaimAge,
}: SSResultsTableProps) {
  if (scenarios.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left text-xs font-medium text-zinc-400 pb-3 px-3">
              Claim Age
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              Monthly
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              Annual
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              By Age 75
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              By Age 80
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              By Age 85
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              Lifetime Total
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              NPV
            </th>
            <th className="text-right text-xs font-medium text-zinc-400 pb-3 px-3">
              Break-even
            </th>
          </tr>
        </thead>
        <tbody>
          {scenarios.map((scenario) => {
            const isOptimal = scenario.claimAge === optimalClaimAge;
            const cumulativeAt75 =
              scenario.claimAge <= 75
                ? scenario.monthlyBenefit * 12 * (75 - scenario.claimAge)
                : 0;
            const cumulativeAt80 =
              scenario.claimAge <= 80
                ? scenario.monthlyBenefit * 12 * (80 - scenario.claimAge)
                : 0;
            const cumulativeAt85 =
              scenario.claimAge <= 85
                ? scenario.monthlyBenefit * 12 * (85 - scenario.claimAge)
                : 0;

            return (
              <tr
                key={scenario.claimAge}
                className={`border-b border-zinc-800/50 ${
                  isOptimal
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : "hover:bg-zinc-900/30"
                }`}
              >
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        isOptimal ? "text-emerald-400" : "text-zinc-200"
                      }`}
                    >
                      {scenario.claimAge}
                    </span>
                    {isOptimal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                        BEST
                      </span>
                    )}
                    {scenario.claimAge === 67 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-700/50 text-zinc-400">
                        FRA
                      </span>
                    )}
                  </div>
                </td>
                <td className="text-right text-sm text-zinc-300 py-3 px-3">
                  {formatCurrency(scenario.monthlyBenefit)}
                </td>
                <td className="text-right text-sm text-zinc-300 py-3 px-3">
                  {formatCurrency(scenario.monthlyBenefit * 12)}
                </td>
                <td className="text-right text-sm text-zinc-400 py-3 px-3">
                  {formatCurrency(cumulativeAt75)}
                </td>
                <td className="text-right text-sm text-zinc-400 py-3 px-3">
                  {formatCurrency(cumulativeAt80)}
                </td>
                <td className="text-right text-sm text-zinc-400 py-3 px-3">
                  {formatCurrency(cumulativeAt85)}
                </td>
                <td
                  className={`text-right text-sm font-medium py-3 px-3 ${
                    isOptimal ? "text-emerald-400" : "text-zinc-200"
                  }`}
                >
                  {formatCurrency(scenario.lifetimeTotal)}
                </td>
                <td className="text-right text-sm text-zinc-400 py-3 px-3">
                  {formatCurrency(scenario.npv)}
                </td>
                <td className="text-right text-sm text-zinc-400 py-3 px-3">
                  {scenario.breakEvenVsAge67 === Infinity ||
                  scenario.breakEvenVsAge67 > 100
                    ? "N/A"
                    : scenario.breakEvenVsAge67.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
