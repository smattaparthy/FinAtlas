"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";

interface CashflowChartProps {
  series: SeriesPoint[];
  height?: number;
}

function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  if (absAmount >= 1000000) {
    return `${sign}$${(absAmount / 1000000).toFixed(1)}M`;
  }
  if (absAmount >= 1000) {
    return `${sign}$${(absAmount / 1000).toFixed(0)}k`;
  }
  return `${sign}$${absAmount.toFixed(0)}`;
}

export default function CashflowChart({ series, height = 300 }: CashflowChartProps) {
  const chartData = useMemo(() => {
    if (series.length === 0) return null;

    const values = series.map((d) => d.v);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 0);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Generate path points
    const points = series.map((d, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
      const date = new Date(d.t);
      return { x, y, value: d.v, date };
    });

    // Create SVG path
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    // Zero line (if applicable)
    const zeroY = chartHeight - ((0 - adjustedMin) / adjustedRange) * chartHeight;

    return { points, linePath, ticks, adjustedMin, adjustedMax, zeroY };
  }, [series]);

  if (!chartData || series.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 w-20 flex flex-col justify-between text-xs text-zinc-500 py-2">
        {chartData.ticks.map((tick, i) => (
          <div key={i} className="text-right pr-2">
            {formatCurrency(tick.value)}
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-20 right-0 top-0 bottom-6">
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          {/* Grid lines */}
          {chartData.ticks.map((tick, i) => (
            <line
              key={i}
              x1="0"
              y1={tick.y}
              x2="100"
              y2={tick.y}
              stroke="currentColor"
              strokeWidth="0.3"
              className="text-zinc-800"
            />
          ))}

          {/* Zero line (thicker if data crosses zero) */}
          {chartData.zeroY >= 0 && chartData.zeroY <= 100 && (
            <line
              x1="0"
              y1={chartData.zeroY}
              x2="100"
              y2={chartData.zeroY}
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-zinc-600"
              strokeDasharray="2,2"
            />
          )}

          {/* Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke="rgb(34, 211, 152)"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          {/* Data points */}
          {chartData.points.map((point, i) => (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="2"
              fill="rgb(34, 211, 152)"
              className="hover:r-3 transition-all"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-20 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
        {series.filter((_, i) => i === 0 || i === series.length - 1 || i === Math.floor(series.length / 2)).map((d, i) => (
          <div key={i}>{new Date(d.t).getFullYear()}-{String(new Date(d.t).getMonth() + 1).padStart(2, '0')}</div>
        ))}
      </div>
    </div>
  );
}
