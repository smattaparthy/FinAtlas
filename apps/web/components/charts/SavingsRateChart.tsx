"use client";

import { useMemo } from "react";
import type { SeriesPoint } from "@finatlas/engine/src/types";
import { formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";

interface SavingsRateChartProps {
  incomeSeries: SeriesPoint[];
  expenseSeries: SeriesPoint[];
  taxesSeries: SeriesPoint[];
  height?: number;
}

export default function SavingsRateChart({
  incomeSeries,
  expenseSeries,
  taxesSeries,
  height = 300,
}: SavingsRateChartProps) {
  const chartData = useMemo(() => {
    if (!incomeSeries || incomeSeries.length === 0 || !expenseSeries || expenseSeries.length === 0 || !taxesSeries || taxesSeries.length === 0) return null;

    // Calculate savings rate for each month
    const savingsRateData: { date: string; rate: number }[] = [];
    for (let i = 0; i < incomeSeries.length; i++) {
      const income = incomeSeries[i].v;
      const expense = expenseSeries[i].v;
      const tax = taxesSeries[i].v;

      const netIncome = income - tax;
      const savings = income - tax - expense;
      const savingsRate = netIncome > 0 ? (savings / netIncome) * 100 : 0;

      savingsRateData.push({
        date: incomeSeries[i].t,
        rate: savingsRate,
      });
    }

    const values = savingsRateData.map((d) => d.rate);
    const minValue = Math.min(...values, 0);
    const maxValue = Math.max(...values, 100);
    const range = maxValue - minValue || 1;
    const padding = range * 0.1;
    const adjustedMin = Math.max(minValue - padding, -10);
    const adjustedMax = Math.min(maxValue + padding, 110);
    const adjustedRange = adjustedMax - adjustedMin;

    const width = 100;
    const chartHeight = 100;

    // Generate path points
    const points = savingsRateData.map((d, i) => {
      const x = (i / (savingsRateData.length - 1)) * width;
      const y = chartHeight - ((d.rate - adjustedMin) / adjustedRange) * chartHeight;
      return { x, y, value: d.rate };
    });

    // Create SVG path
    const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
    const areaPath = `${linePath} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

    // Y-axis ticks
    const tickCount = 5;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = adjustedMin + (adjustedRange * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * chartHeight;
      return { value, y };
    });

    return { points, linePath, areaPath, ticks, savingsRateData };
  }, [incomeSeries, expenseSeries, taxesSeries]);

  if (!chartData || incomeSeries.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-zinc-500"
        style={{ height }}
      >
        Not enough data to display chart
      </div>
    );
  }

  const tooltipData = chartData.savingsRateData.map((d) => ({
    date: d.date,
    values: [{ label: "Savings Rate", value: d.rate, color: "rgb(139, 92, 246)" }],
  }));

  return (
    <ChartTooltip data={tooltipData} formatValue={(v) => `${v.toFixed(1)}%`} leftOffset={64}>
      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-zinc-500 py-2">
          {chartData.ticks.map((tick, i) => (
            <div key={i} className="text-right pr-2">
              {tick.value.toFixed(0)}%
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
              <linearGradient id="savingsRateGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <path
              d={chartData.areaPath}
              fill="url(#savingsRateGradient)"
            />

            {/* Line */}
            <path
              d={chartData.linePath}
              fill="none"
              stroke="rgb(139, 92, 246)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {chartData.savingsRateData.filter((_, i) => i === 0 || i === chartData.savingsRateData.length - 1 || i === Math.floor(chartData.savingsRateData.length / 2)).map((d, i) => (
            <div key={i}>{formatAxisDate(d.date)}</div>
          ))}
        </div>
      </div>
    </ChartTooltip>
  );
}
