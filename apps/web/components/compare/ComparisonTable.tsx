"use client";

import type { AnnualSummaryRow } from "@finatlas/engine/src/types";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";
import { SCENARIO_COLORS } from "./ScenarioComparisonPicker";

interface ScenarioSummary {
  name: string;
  annual: AnnualSummaryRow[];
}

interface ComparisonTableProps {
  scenarios: ScenarioSummary[];
}

export default function ComparisonTable({ scenarios }: ComparisonTableProps) {
  if (scenarios.length < 2) return null;

  // Align by year
  const allYears = new Set<number>();
  scenarios.forEach((s) => s.annual.forEach((r) => allYears.add(r.year)));
  const years = [...allYears].sort();

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-400 uppercase tracking-wide">
              <th className="px-4 py-3 font-medium">Year</th>
              {scenarios.map((s, idx) => (
                <th key={idx} className="px-4 py-3 font-medium text-right">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SCENARIO_COLORS[idx] }} />
                    {s.name}
                  </span>
                </th>
              ))}
              {scenarios.length === 2 && (
                <th className="px-4 py-3 font-medium text-right">Delta</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {years.map((year) => {
              const values = scenarios.map((s) => {
                const row = s.annual.find((r) => r.year === year);
                return row?.endNetWorth ?? null;
              });

              const delta = scenarios.length === 2 && values[0] !== null && values[1] !== null
                ? values[0] - values[1]
                : null;

              return (
                <tr key={year} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{year}</td>
                  {values.map((v, idx) => (
                    <td key={idx} className="px-4 py-3 text-sm text-right text-zinc-300">
                      {v !== null ? formatCompactCurrency(v) : "-"}
                    </td>
                  ))}
                  {delta !== null && (
                    <td className={`px-4 py-3 text-sm text-right font-medium ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-red-400" : "text-zinc-500"}`}>
                      {delta > 0 ? "+" : ""}{formatCompactCurrency(delta)}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
