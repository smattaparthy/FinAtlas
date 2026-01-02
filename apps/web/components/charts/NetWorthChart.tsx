"use client";

import { useMemo } from "react";

interface DataPoint {
  year: number;
  value: number;
}

interface NetWorthChartProps {
  data: DataPoint[];
  height?: number;
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

export default function NetWorthChart({ data, height = 200 }: NetWorthChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((d) => d.value);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = minValue - padding;
    const adjustedMax = maxValue + padding;
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Generate path points
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = chartHeight - ((d.value - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.value, year: d.year };
    });

    // Create SVG path
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

    // Y-axis ticks
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    return { points, linePath, areaPath, ticks, adjustedMin, adjustedMax };
  }, [data]);

  if (!chartData || data.length < 2) {
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
      <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-zinc-500 py-2">
        {chartData.ticks.map((tick, i) => (
          <div key={i} className="text-right pr-2">
            {formatCurrency(tick.value)}
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="absolute left-16 right-0 top-0 bottom-6">
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

          {/* Area fill with gradient */}
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d={chartData.areaPath}
            fill="url(#netWorthGradient)"
          />

          {/* Line */}
          <path
            d={chartData.linePath}
            fill="none"
            stroke="rgb(34, 197, 94)"
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
              fill="rgb(34, 197, 94)"
              className="hover:r-3 transition-all"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
        {data.filter((_, i) => i === 0 || i === data.length - 1 || (data.length > 5 && i === Math.floor(data.length / 2))).map((d, i) => (
          <div key={i}>{d.year}</div>
        ))}
      </div>
    </div>
  );
}
