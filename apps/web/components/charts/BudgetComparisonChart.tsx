"use client";

import { useMemo } from "react";
import { formatCompactCurrency } from "@/lib/format";

interface BudgetRow {
  category: string;
  planned: number;
  actual: number;
  variance: number;
}

interface BudgetComparisonChartProps {
  rows: BudgetRow[];
  height?: number;
}

export default function BudgetComparisonChart({ rows, height = 300 }: BudgetComparisonChartProps) {
  const chartData = useMemo(() => {
    if (!rows || rows.length === 0) return null;

    const maxValue = Math.max(...rows.flatMap((r) => [r.planned, r.actual]), 1);
    const barGroupHeight = 100 / rows.length;
    const barHeight = barGroupHeight * 0.3;
    const gap = barGroupHeight * 0.1;

    return { maxValue, barGroupHeight, barHeight, gap };
  }, [rows]);

  if (!chartData || rows.length === 0) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        No budget data to display
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Category labels on left */}
      <div className="absolute left-0 top-0 bottom-0 w-28 flex flex-col">
        {rows.map((row, i) => (
          <div
            key={row.category}
            className="flex items-center text-xs text-zinc-400 truncate pr-2"
            style={{
              height: `${chartData.barGroupHeight}%`,
            }}
          >
            <span className="truncate text-right w-full">{row.category}</span>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-28 right-16 top-0 bottom-0">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
          {rows.map((row, i) => {
            const yBase = i * chartData.barGroupHeight;
            const plannedWidth = (row.planned / chartData.maxValue) * 100;
            const actualWidth = (row.actual / chartData.maxValue) * 100;
            const overBudget = row.actual > row.planned;

            return (
              <g key={row.category}>
                {/* Planned bar */}
                <rect
                  x="0"
                  y={yBase + chartData.gap}
                  width={Math.max(plannedWidth, 0.5)}
                  height={chartData.barHeight}
                  fill="rgb(113, 113, 122)"
                  opacity="0.5"
                  rx="0.5"
                />
                {/* Actual bar */}
                <rect
                  x="0"
                  y={yBase + chartData.gap + chartData.barHeight + chartData.gap * 0.5}
                  width={Math.max(actualWidth, 0.5)}
                  height={chartData.barHeight}
                  fill={overBudget ? "rgb(239, 68, 68)" : "rgb(34, 197, 94)"}
                  opacity="0.8"
                  rx="0.5"
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Value labels on right */}
      <div className="absolute right-0 top-0 bottom-0 w-16 flex flex-col">
        {rows.map((row) => (
          <div
            key={row.category}
            className="flex items-center text-xs font-medium"
            style={{ height: `${chartData.barGroupHeight}%` }}
          >
            <span className={row.variance < 0 ? "text-red-400" : "text-emerald-400"}>
              {row.variance >= 0 ? "+" : ""}
              {formatCompactCurrency(row.variance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
