"use client";

import { useMemo } from "react";
import { formatCompactCurrency, formatAxisDate } from "@/lib/format";
import ChartTooltip from "./ChartTooltip";
import type { MonthlyPayoffState } from "@/lib/debt/payoffStrategies";

interface DebtPayoffChartProps {
  avalanche: MonthlyPayoffState[];
  snowball: MonthlyPayoffState[];
  height?: number;
}

export default function DebtPayoffChart({
  avalanche,
  snowball,
  height = 300,
}: DebtPayoffChartProps) {
  const chartData = useMemo(() => {
    const maxLen = Math.max(avalanche.length, snowball.length);
    if (maxLen < 2) return null;

    const maxBalance = Math.max(
      ...avalanche.map((s) => s.totalBalance),
      ...snowball.map((s) => s.totalBalance),
      1
    );

    const padding = maxBalance * 0.05;
    const adjustedMax = maxBalance + padding;

    const w = 100;
    const h = 100;

    function toY(v: number) {
      return h - (v / adjustedMax) * h;
    }
    function toX(i: number) {
      return (i / (maxLen - 1)) * w;
    }

    // Build paths
    const avalanchePath = avalanche
      .map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(s.totalBalance)}`)
      .join(" ");

    const snowballPath = snowball
      .map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(s.totalBalance)}`)
      .join(" ");

    // Y-axis ticks
    const tickCount = 4;
    const ticks = Array.from({ length: tickCount }, (_, i) => {
      const value = (adjustedMax * (tickCount - 1 - i)) / (tickCount - 1);
      const y = (i / (tickCount - 1)) * h;
      return { value, y };
    });

    return { avalanchePath, snowballPath, ticks, maxLen };
  }, [avalanche, snowball]);

  if (!chartData) {
    return (
      <div className="flex items-center justify-center text-zinc-500" style={{ height }}>
        Not enough data to display chart
      </div>
    );
  }

  // Build tooltip data using the longer schedule
  const maxLen = chartData.maxLen;
  const tooltipData = Array.from({ length: maxLen }, (_, i) => {
    const aVal = i < avalanche.length ? avalanche[i].totalBalance : 0;
    const sVal = i < snowball.length ? snowball[i].totalBalance : 0;
    const date = i < avalanche.length ? avalanche[i].date : snowball[i]?.date ?? "";
    return {
      date,
      values: [
        { label: "Avalanche", value: aVal, color: "rgb(34, 197, 94)" },
        { label: "Snowball", value: sVal, color: "rgb(245, 158, 11)" },
      ],
    };
  });

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
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
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

            {/* Snowball line (behind) */}
            <path
              d={chartData.snowballPath}
              fill="none"
              stroke="rgb(245, 158, 11)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              opacity="0.8"
            />

            {/* Avalanche line (front) */}
            <path
              d={chartData.avalanchePath}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-16 right-0 bottom-0 flex justify-between text-xs text-zinc-500">
          {[0, Math.floor((maxLen - 1) / 2), maxLen - 1]
            .filter((i) => i < maxLen)
            .map((idx) => {
              const date = idx < avalanche.length ? avalanche[idx].date : snowball[idx]?.date ?? "";
              return <div key={idx}>{formatAxisDate(date)}</div>;
            })}
        </div>
      </div>
    </ChartTooltip>
  );
}
