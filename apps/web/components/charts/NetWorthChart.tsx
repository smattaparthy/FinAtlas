"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface Milestone {
  date: string;
  name: string;
  color: string;
}

interface NetWorthChartProps {
  series: SeriesPoint[];
  height?: number;
  milestones?: Milestone[];
}

export default function NetWorthChart({ series, height = 200, milestones = [] }: NetWorthChartProps) {
  const chartData = useMemo(() => {
    if (!series || series.length === 0) return null;

    const values = series.map((d) => d.v);
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
    const points = series.map((d, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = chartHeight - ((d.v - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.v, date: d.t };
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

    // Map milestones to chart coordinates
    const milestoneMarkers = milestones
      .map((m) => {
        const mTime = new Date(m.date).getTime();
        const startTime = new Date(series[0].t).getTime();
        const endTime = new Date(series[series.length - 1].t).getTime();
        const timeRange = endTime - startTime;
        if (timeRange === 0) return null;

        const xFraction = (mTime - startTime) / timeRange;
        if (xFraction < 0 || xFraction > 1) return null;

        const x = xFraction * width;
        // Interpolate y value
        const indexFloat = xFraction * (series.length - 1);
        const indexLow = Math.floor(indexFloat);
        const indexHigh = Math.min(indexLow + 1, series.length - 1);
        const frac = indexFloat - indexLow;
        const interpValue = series[indexLow].v + (series[indexHigh].v - series[indexLow].v) * frac;
        const y = chartHeight - ((interpValue - adjustedMin) / adjustedRange) * chartHeight;

        return { x, y, name: m.name, color: m.color };
      })
      .filter(Boolean) as Array<{ x: number; y: number; name: string; color: string }>;

    return { points, linePath, areaPath, ticks, adjustedMin, adjustedMax, milestoneMarkers };
  }, [series, milestones]);

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

  const tooltipData = series.map((d) => ({
    date: d.t,
    values: [{ label: "Net Worth", value: d.v, color: "rgb(34, 197, 94)" }],
  }));

  return (
    <ChartTooltip data={tooltipData} leftOffset={64}>
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-zinc-500 py-2">
          {chartData.ticks.map((tick, i) => (
            <div key={i} className="text-right pr-2">
              {formatCompactCurrency(tick.value)}
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
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
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
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* Milestone markers */}
            {chartData.milestoneMarkers.map((m, i) => (
              <g key={i}>
                {/* Vertical dashed line */}
                <line
                  x1={m.x}
                  y1={m.y}
                  x2={m.x}
                  y2={100}
                  stroke={m.color}
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  vectorEffect="non-scaling-stroke"
                  opacity="0.5"
                />
                {/* Diamond marker */}
                <polygon
                  points={`${m.x},${m.y - 4} ${m.x + 3},${m.y} ${m.x},${m.y + 4} ${m.x - 3},${m.y}`}
                  fill={m.color}
                  stroke="rgb(var(--zinc-950))"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {series.filter((_, i) => i === 0 || i === series.length - 1 || (series.length > 5 && i === Math.floor(series.length / 2))).map((d, i) => (
            <div key={i}>{formatAxisDate(d.t)}</div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
}
