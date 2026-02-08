"use client";

import { formatCurrency, formatPercent } from "@/lib/format";
import type { BracketDetail } from "@/lib/tax/taxCalculations";

interface TaxBracketChartProps {
  brackets: BracketDetail[];
  height?: number;
}

export default function TaxBracketChart({
  brackets,
  height = 200,
}: TaxBracketChartProps) {
  if (brackets.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height: `${height}px` }}
      >
        No tax brackets to display
      </div>
    );
  }

  const totalTax = brackets.reduce((sum, b) => sum + b.taxInBracket, 0);
  const maxRate = Math.max(...brackets.map((b) => b.rate));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {brackets.map((bracket, index) => {
          const widthPercent =
            totalTax > 0 ? (bracket.taxInBracket / totalTax) * 100 : 0;
          const opacity = 0.3 + (bracket.rate / maxRate) * 0.7;

          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-zinc-400">
                <span>{bracket.range}</span>
                <span>{formatPercent(bracket.rate)}</span>
              </div>
              <div className="relative h-10 w-full rounded-lg bg-zinc-800/50">
                <div
                  className="absolute left-0 top-0 h-full rounded-lg bg-emerald-500 transition-all"
                  style={{
                    width: `${widthPercent}%`,
                    opacity,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-end px-3">
                  <span className="text-sm font-medium text-zinc-50">
                    {formatCurrency(bracket.taxInBracket)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
