"use client";

import { formatCurrency } from "@/lib/format";

interface BreakdownItem {
  label: string;
  amount: number;
  color: string;
}

interface CoverageBreakdownChartProps {
  breakdown: BreakdownItem[];
  existingCoverage: number;
  totalRecommended: number;
}

export default function CoverageBreakdownChart({
  breakdown,
  existingCoverage,
  totalRecommended,
}: CoverageBreakdownChartProps) {
  const maxVal = Math.max(totalRecommended, existingCoverage, 1);
  const hasGap = existingCoverage < totalRecommended;
  const coveragePct = Math.min((existingCoverage / maxVal) * 100, 100);

  return (
    <div className="space-y-4">
      {/* Stacked bar */}
      <div>
        <div className="mb-2 text-sm font-medium text-zinc-300">
          Coverage Breakdown
        </div>
        <div className="relative">
          {/* Bar container */}
          <div className="flex h-10 w-full overflow-hidden rounded-lg bg-zinc-800">
            {breakdown.map((item, i) => {
              const widthPct =
                totalRecommended > 0
                  ? (item.amount / totalRecommended) * 100
                  : 0;
              if (widthPct <= 0) return null;
              return (
                <div
                  key={i}
                  className="flex items-center justify-center overflow-hidden text-xs font-medium text-white/90 transition-all duration-300"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: item.color,
                    minWidth: widthPct > 3 ? undefined : "4px",
                  }}
                >
                  {widthPct > 12 && (
                    <span className="truncate px-1">
                      {formatCurrency(item.amount)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Existing coverage marker */}
          {existingCoverage > 0 && (
            <div
              className="absolute top-0 h-10 border-r-2 border-dashed border-white/80"
              style={{ left: `${coveragePct}%` }}
            >
              <div className="absolute -top-6 -translate-x-1/2 whitespace-nowrap text-xs font-medium text-zinc-300">
                Existing: {formatCurrency(existingCoverage)}
              </div>
            </div>
          )}

          {/* Gap region */}
          {hasGap && existingCoverage > 0 && (
            <div
              className="absolute top-0 h-10 bg-red-500/15 border-y border-red-500/30"
              style={{
                left: `${coveragePct}%`,
                width: `${100 - coveragePct}%`,
              }}
            />
          )}
        </div>

        {/* Labels below the bar */}
        <div className="mt-6 flex justify-between text-xs text-zinc-500">
          <span>$0</span>
          <span>Recommended: {formatCurrency(totalRecommended)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-4">
        {breakdown.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <div className="min-w-0">
              <div className="truncate text-xs text-zinc-400">{item.label}</div>
              <div className="text-sm font-medium text-zinc-200">
                {formatCurrency(item.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
